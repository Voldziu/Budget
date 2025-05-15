// src/components/AddCategoryModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// Predefined icons and colors for category selection
const CATEGORY_ICONS = [
  'home', 'shopping-cart', 'coffee', 'car', 'truck', 'film', 'heart', 'book', 
  'briefcase', 'gift', 'smartphone', 'credit-card', 'dollar-sign', 'trending-up',
  'zap', 'award', 'umbrella', 'map-pin', 'shield', 'scissors', 'music', 'map',
  'package', 'globe', 'cloud', 'server', 'wifi', 'bell', 'tool', 'settings'
];

const CATEGORY_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', 
  '#795548', '#607D8B', '#E91E63', '#673AB7', '#3F51B5', '#009688',
  '#CDDC39', '#FFEB3B', '#FF5722', '#8BC34A', '#FFC107', '#03A9F4',
  '#7E57C2', '#5C6BC0', '#26A69A', '#66BB6A', '#29B6F6', '#FFA726'
];

const AddCategoryModal = ({ visible, onClose, onAddCategory }) => {
  const [categoryName, setCategoryName] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(CATEGORY_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  
  const resetForm = () => {
    setCategoryName('');
    setBudget('');
    setSelectedIcon(CATEGORY_ICONS[0]);
    setSelectedColor(CATEGORY_COLORS[0]);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const handleAddCategory = async () => {
    // Validate inputs
    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }
    
    // Budget can be empty (0) for categories that don't need a budget
    const budgetValue = budget.trim() ? parseFloat(budget.replace(',', '.')) : 0;
    
    if (isNaN(budgetValue)) {
      alert('Please enter a valid budget amount');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const newCategory = {
        name: categoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        budget: budgetValue
      };
      
      const success = await onAddCategory(newCategory);
      
      if (success) {
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Error in handleAddCategory:', error);
      alert('Failed to add category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add New Category</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="x" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* Category Preview */}
          <View style={styles.categoryPreviewContainer}>
            <View 
              style={[
                styles.categoryPreview,
                { backgroundColor: selectedColor }
              ]}
            >
              <Icon name={selectedIcon} size={32} color="#fff" />
              <Text style={styles.categoryPreviewText}>
                {categoryName || 'Category Name'}
              </Text>
            </View>
          </View>
          
          {/* Category Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Groceries, Entertainment..."
              value={categoryName}
              onChangeText={setCategoryName}
              autoCapitalize="words"
            />
          </View>
          
          {/* Budget Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Budget (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />
          </View>
          
          {/* Icon Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Choose an Icon</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconItem,
                    selectedIcon === icon && styles.selectedIcon
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Icon name={icon} size={24} color={selectedIcon === icon ? selectedColor : '#666'} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Color Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Choose a Color</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorItem,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColor
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </View>
          
          {/* Add Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCategory}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Add Category</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 'auto',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    padding: 16,
  },
  categoryPreviewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPreviewText: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  iconItem: {
    width: '16.6%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    margin: 4,
  },
  selectedIcon: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  colorItem: {
    width: '16.6%',
    aspectRatio: 1,
    marginVertical: 8,
    borderRadius: 8,
    margin: 4,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddCategoryModal;