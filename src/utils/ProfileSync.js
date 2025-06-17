import { supabase } from './supabase';
import { useState, useEffect } from 'react';

export class ProfileSync {
  
  // Wywołaj to po każdym logowaniu użytkownika
  static async ensureUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return null;
      }

      console.log('Ensuring profile for user:', user.id);

      // Metoda 1: Sprawdź czy profil już istnieje
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing profile:', selectError);
      }

      if (existingProfile) {
        console.log('Profile already exists, updating if needed');
        
        // Zaktualizuj profil jeśli email lub nazwa się zmieniły
        const updatedFullName = user.user_metadata?.full_name || 
                               user.user_metadata?.name || 
                               user.email.split('@')[0];

        if (existingProfile.email !== user.email || 
            existingProfile.full_name !== updatedFullName) {
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              email: user.email,
              full_name: updatedFullName,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error updating profile:', updateError);
          } else {
            console.log('Profile updated successfully');
          }
        }

        return existingProfile;
      }

      // Metoda 2: Stwórz nowy profil
      console.log('Creating new profile');
      
      const newProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 
                  user.user_metadata?.name || 
                  user.email.split('@')[0]
      };

      const { data: createdProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        
        // Jeśli błąd to duplicate key, ignoruj
        if (insertError.code === '23505') {
          console.log('Profile already exists (race condition), fetching existing');
          return await this.getProfile();
        }
        
        throw insertError;
      }

      console.log('Profile created successfully:', createdProfile);
      return createdProfile;

    } catch (error) {
      console.error('Error ensuring user profile:', error);
      return null;
    }
  }

  // Pobierz profil aktualnego użytkownika
  static async getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error getting profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  // Zaktualizuj profil użytkownika
  static async updateProfile(updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      console.log('Profile updated:', data);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Pobierz profil użytkownika po ID (dla członków grup)
  static async getProfileById(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting profile by ID:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error getting profile by ID:', error);
      return null;
    }
  }

  // Masowo stwórz profile dla istniejących użytkowników (wywołaj raz)
  static async createProfilesForExistingUsers() {
    try {
      console.log('Creating profiles for existing users...');
      
      // Pobierz wszystkich członków grup, którzy nie mają profili
      const { data: membersWithoutProfiles, error } = await supabase
        .from('budget_group_members')
        .select(`
          user_id,
          profiles:user_id (id)
        `)
        .is('profiles.id', null);

      if (error) {
        console.error('Error getting members without profiles:', error);
        return;
      }

      console.log(`Found ${membersWithoutProfiles?.length || 0} users without profiles`);

      // Dla każdego użytkownika bez profilu, stwórz podstawowy profil
      if (membersWithoutProfiles?.length > 0) {
        const profilesToCreate = membersWithoutProfiles.map(member => ({
          id: member.user_id,
          email: `user-${member.user_id.substring(0, 8)}@unknown.com`, // Placeholder
          full_name: `User ${member.user_id.substring(0, 8)}`
        }));

        const { error: batchError } = await supabase
          .from('profiles')
          .insert(profilesToCreate);

        if (batchError) {
          console.error('Error creating batch profiles:', batchError);
        } else {
          console.log(`Created ${profilesToCreate.length} profiles`);
        }
      }

    } catch (error) {
      console.error('Error creating profiles for existing users:', error);
    }
  }
}

// Hook do synchronizacji profilu
export const useProfileSync = () => {
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      try {
        await ProfileSync.ensureUserProfile();
        setProfileReady(true);
      } catch (error) {
        console.error('Error initializing profile:', error);
        setProfileReady(true); // Continue anyway
      }
    };

    // Sprawdź czy użytkownik jest zalogowany
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        initProfile();
      } else {
        setProfileReady(true);
      }
    });

    // Nasłuchuj zmian stanu auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await initProfile();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return profileReady;
}; 