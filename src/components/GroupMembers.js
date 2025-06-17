import React from 'react';
import { BudgetGroupController } from '../controllers/BudgetGroupController';
import './GroupMembers.css';

// Komponent do wyświetlania pojedynczego członka
const MemberCard = ({ member }) => {
  // Funkcja pomocnicza do wyświetlania nazwy użytkownika
  const getDisplayName = (member) => {
    // Priorytet: full_name > email bez domeny > fallback
    if (member.full_name && member.full_name !== `User ${member.user_id?.substring(0, 8)}`) {
      return member.full_name;
    }
    
    if (member.email && !member.email.includes('@unknown.com')) {
      return member.email.split('@')[0];
    }
    
    if (member.display_name) {
      return member.display_name;
    }
    
    return `User ${member.user_id?.substring(0, 8) || 'Unknown'}`;
  };

  const getDisplayEmail = (member) => {
    if (member.email && !member.email.includes('@unknown.com')) {
      return member.email;
    }
    return 'Email not available';
  };

  const displayName = getDisplayName(member);
  const displayEmail = getDisplayEmail(member);

  return (
    <div className="member-card">
      {/* Avatar */}
      <div className="member-avatar">
        {member.avatar_url ? (
          <img 
            src={member.avatar_url} 
            alt={displayName}
            className="avatar-image"
          />
        ) : (
          <div className="avatar-placeholder">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Informacje o użytkowniku */}
      <div className="member-info">
        <h4 className="member-name">{displayName}</h4>
        <p className="member-email">{displayEmail}</p>
        <span className="member-role">{member.role}</span>
      </div>

      {/* Debug info (usuń w produkcji) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info" style={{ fontSize: '12px', color: '#666' }}>
          <p>ID: {member.user_id}</p>
          <p>Profile: {member.profiles ? 'OK' : 'MISSING'}</p>
        </div>
      )}
    </div>
  );
};

// Główny komponent listy członków
const GroupMembersList = ({ groupId, members, onRemoveMember }) => {
  return (
    <div className="members-list">
      <h3>Członkowie grupy ({members.length})</h3>
      
      {members.length === 0 ? (
        <p>Brak członków w grupie</p>
      ) : (
        <div className="members-grid">
          {members.map(member => (
            <div key={member.id || member.user_id} className="member-wrapper">
              <MemberCard member={member} />
              
              {/* Przycisk usuwania (tylko dla adminów) */}
              {onRemoveMember && member.role !== 'admin' && (
                <button 
                  onClick={() => onRemoveMember(member.user_id)}
                  className="remove-member-btn"
                  title="Usuń członka"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Hook do pobierania członków grupy
const useGroupMembers = (groupId) => {
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchMembers = React.useCallback(async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      setError(null);

      // Używaj poprawionej metody
      const controller = new BudgetGroupController();
      const membersData = await controller.getGroupMembers(groupId);
      
      console.log('Fetched members:', membersData);
      setMembers(membersData || []);

    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
};

// Przykład użycia
const GroupPage = ({ groupId }) => {
  const { members, loading, error, refetch } = useGroupMembers(groupId);

  const handleRemoveMember = async (userId) => {
    try {
      const controller = new BudgetGroupController();
      await controller.removeMemberFromGroup(groupId, userId);
      refetch(); // Odśwież listę
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Błąd podczas usuwania członka');
    }
  };

  if (loading) return <div>Ładowanie członków...</div>;
  if (error) return <div>Błąd: {error}</div>;

  return (
    <div className="group-page">
      <GroupMembersList 
        groupId={groupId}
        members={members}
        onRemoveMember={handleRemoveMember}
      />
    </div>
  );
};

export { MemberCard, GroupMembersList, useGroupMembers, GroupPage }; 