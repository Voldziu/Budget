// 5. Stwórzmy kontroler do obsługi zdjęć:
// src/controllers/ImageController.js
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { supabase } from '../utils/supabase';
import { getAuthenticatedUser } from '../utils/supabase';

export class ImageController {
  constructor() {
    // Katalog na zdjęcia paragonów
    this.receiptDir = `${RNFS.DocumentDirectoryPath}/receipts`;
    this.initializeStorage();
  }

  async initializeStorage() {
    // Upewniamy się, że katalog na paragony istnieje
    try {
      const exists = await RNFS.exists(this.receiptDir);
      if (!exists) {
        await RNFS.mkdir(this.receiptDir);
        console.log('Utworzono katalog na paragony');
      }
    } catch (error) {
      console.error('Błąd przy tworzeniu katalogu:', error);
    }
  }

  // Zapisuje zdjęcie w lokalnym systemie plików
  async saveReceiptImage(imageUri, transactionId) {
    try {
      // Generuj unikalną nazwę pliku bazującą na ID transakcji
      const fileName = `receipt_${transactionId}_${Date.now()}.jpg`;
      const destPath = `${this.receiptDir}/${fileName}`;
      
      // Kopiuj plik
      await RNFS.copyFile(imageUri, destPath);
      console.log('Zapisano zdjęcie paragonu:', destPath);
      
      return destPath;
    } catch (error) {
      console.error('Błąd przy zapisywaniu zdjęcia:', error);
      throw error;
    }
  }

  // Usuwa zdjęcie z lokalnego systemu plików
  async deleteReceiptImage(imagePath) {
    try {
      if (!imagePath) return;
      
      const exists = await RNFS.exists(imagePath);
      if (exists) {
        await RNFS.unlink(imagePath);
        console.log('Usunięto zdjęcie paragonu:', imagePath);
      }
    } catch (error) {
      console.error('Błąd przy usuwaniu zdjęcia:', error);
      throw error;
    }
  }

  // Przesyła zdjęcie do Supabase Storage (gdy użytkownik jest online)
  async uploadReceiptImage(imagePath, transactionId) {
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        console.error('Użytkownik nie jest zalogowany');
        return null;
      }
      
      // Generuj unikalną nazwę pliku w bucket
      const fileName = `${user.id}/${transactionId}_${Date.now()}.jpg`;
      
      // Przygotuj plik do przesłania
      const fileData = await RNFS.readFile(imagePath, 'base64');
      
      // Prześlij plik do Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, fileData, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      
      if (error) {
        console.error('Błąd przy przesyłaniu do Supabase:', error);
        return null;
      }
      
      // Pobierz publiczny URL do zdjęcia
      const { data: publicUrl } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);
      
      console.log('Przesłano zdjęcie do Supabase:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Błąd przy przesyłaniu zdjęcia:', error);
      return null;
    }
  }
  
  // Pobiera zdjęcie z Supabase Storage
  async getReceiptImageUrl(storageKey) {
    if (!storageKey) return null;
    
    try {
      const { data: publicUrl } = supabase.storage
        .from('receipts')
        .getPublicUrl(storageKey);
      
      return publicUrl;
    } catch (error) {
      console.error('Błąd przy pobieraniu URL zdjęcia:', error);
      return null;
    }
  }
}
