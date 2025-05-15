// src/components/ReceiptImageModal.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window');

const ReceiptImageModal = ({ visible, imageUri, onClose }) => {
  if (!imageUri) {
    return null;
  }
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="x-circle" size={36} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  imageContainer: {
    width: width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width * 0.9,
    height: height * 0.8,
    maxWidth: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: 8,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    padding: 8,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

export default ReceiptImageModal;