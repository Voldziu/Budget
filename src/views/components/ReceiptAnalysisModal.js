
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { SupabaseTransactionController } from '../../controllers/SupabaseTransactionController';

const ReceiptAnalysisModal = ({ 
  visible, 
  onClose, 
  receiptData, 
  categories,
  receiptImage,
  storeName = "Store Receipt"
}) => {
  const [editedProducts, setEditedProducts] = useState([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize transaction controller
  const transactionController = new SupabaseTransactionController();
  
  // Initialize products data when the receipt data changes
  useEffect(() => {
    if (receiptData && receiptData.length > 0) {
      // Deep copy to avoid modifying original data
      setEditedProducts([...receiptData]);
    }
  }, [receiptData]);
  
  // Calculate total from edited products
  const calculateTotal = () => {
    return editedProducts.reduce((sum, product) => sum + parseFloat(product.price), 0).toFixed(2);
  };
  
  // Handle saving the edited receipt data
  const handleSave = async () => {
    if (editedProducts.length === 0) {
      Alert.alert('No Products', 'There are no products to save.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Process products to ensure they have the required fields
      const productsToSave = [];
      
      // Validate products and get total
      let total = 0;
      let invalidProducts = [];
      
      for (const product of editedProducts) {
        // Verify that product has a category
        if (!product.category) {
          invalidProducts.push(`${product.name}: Missing category`);
          continue;
        }
        
        // Find the category object to get the category ID
        const categoryObj = categories.find(cat => cat.name === product.category);
        
        if (!categoryObj) {
          invalidProducts.push(`${product.name}: Invalid category - ${product.category}`);
          continue;
        }
        
        // Add the product with the category ID
        productsToSave.push({
          name: product.name,
          price: product.price,
          categoryId: categoryObj.id
        });
        
        total += parseFloat(product.price);
      }
      
      if (invalidProducts.length > 0) {
        Alert.alert(
          'Some products have issues',
          `The following products have invalid or missing categories:\n${invalidProducts.join('\n')}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue with valid products', 
              onPress: async () => await saveValidProducts(productsToSave, total)
            }
          ]
        );
      } else {
        await saveValidProducts(productsToSave, total);
      }
    } catch (error) {
      console.error('Error saving transactions:', error);
      Alert.alert('Error', 'Failed to save transactions: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save valid products as parent-child transactions
  const saveValidProducts = async (products, total) => {
    try {
      // Create parent transaction object
      const parentTransaction = {
        amount: total,
        description: storeName || "Receipt",
        // Use the category from the first product as default for the parent
        category: products.length > 0 ? products[0].categoryId : categories[0].id, 
        date: new Date().toISOString(),
        is_income: false,
      };
      
      // Use the addReceiptTransaction method to create parent and children
      const result = await transactionController.addReceiptTransaction(parentTransaction, products);
      
      console.log('Transaction saved with parent and children:', result);
      
      Alert.alert(
        'Success',
        `Saved ${products.length} items as a receipt transaction.`,
        [{ text: 'OK', onPress: () => onClose() }]
      );
    } catch (error) {
      console.error('Error saving receipt transaction:', error);
      Alert.alert('Error', 'Failed to save receipt transaction: ' + error.message);
    }
  };
  
  // Handle editing a product
  const startEditing = (index, field) => {
    setSelectedProductIndex(index);
    setEditMode(field);
    setEditValue(editedProducts[index][field].toString());
  };
  
  // Save the edited value
  const saveEdit = () => {
    if (selectedProductIndex === null || !editMode) return;
    
    const updatedProducts = [...editedProducts];
    
    // Validate price if editing price
    if (editMode === 'price') {
      const numericValue = editValue.replace(',', '.');
      if (isNaN(parseFloat(numericValue)) || parseFloat(numericValue) <= 0) {
        Alert.alert('Invalid Price', 'Please enter a valid price');
        return;
      }
      updatedProducts[selectedProductIndex].price = parseFloat(numericValue);
    } else {
      updatedProducts[selectedProductIndex][editMode] = editValue;
    }
    
    setEditedProducts(updatedProducts);
    cancelEdit();
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setSelectedProductIndex(null);
    setEditMode(null);
    setEditValue('');
    setShowCategoryPicker(false);
  };
  
  // Handle category selection
  const selectCategory = (categoryName) => {
    if (selectedProductIndex === null) return;
    
    const updatedProducts = [...editedProducts];
    updatedProducts[selectedProductIndex].category = categoryName;
    setEditedProducts(updatedProducts);
    setShowCategoryPicker(false);
  };
  
  // Delete a product
  const deleteProduct = (index) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to remove this product?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: () => {
            const updatedProducts = [...editedProducts];
            updatedProducts.splice(index, 1);
            setEditedProducts(updatedProducts);
          },
          style: "destructive" 
        }
      ]
    );
  };
  
  // Render item for product list
  const renderProductItem = ({ item, index }) => {
    const isSelected = selectedProductIndex === index;
    
    return (
      <View style={styles.productItem}>
        {/* Product name */}
        <View style={styles.productField}>
          <Text style={styles.fieldLabel}>Product</Text>
          {isSelected && editMode === 'name' ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
              />
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.editButton} onPress={saveEdit}>
                  <Icon name="check" size={16} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editButton} onPress={cancelEdit}>
                  <Icon name="x" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.fieldValue}
              onPress={() => startEditing(index, 'name')}
            >
              <Text style={styles.productName}>{item.name}</Text>
              <Icon name="edit-2" size={14} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Product category */}
        <View style={styles.productField}>
          <Text style={styles.fieldLabel}>Category</Text>
          {isSelected && editMode === 'category' && showCategoryPicker ? (
            <ScrollView 
              style={styles.categoryPickerContainer}
              nestedScrollEnabled={true}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryOption}
                  onPress={() => selectCategory(category.name)}
                >
                  <View 
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color }
                    ]}
                  >
                    <Icon name={category.icon} size={14} color="#fff" />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity 
              style={styles.fieldValue}
              onPress={() => {
                setSelectedProductIndex(index);
                setEditMode('category');
                setShowCategoryPicker(true);
              }}
            >
              <Text style={styles.productCategory}>{item.category || "Select category"}</Text>
              <Icon name="edit-2" size={14} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Product price */}
        <View style={styles.productField}>
          <Text style={styles.fieldLabel}>Price</Text>
          {isSelected && editMode === 'price' ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="decimal-pad"
                autoFocus
              />
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.editButton} onPress={saveEdit}>
                  <Icon name="check" size={16} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editButton} onPress={cancelEdit}>
                  <Icon name="x" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.fieldValue}
              onPress={() => startEditing(index, 'price')}
            >
              <Text style={styles.productPrice}>{item.price.toFixed(2)}</Text>
              <Icon name="edit-2" size={14} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Delete button */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteProduct(index)}
        >
          <Icon name="trash-2" size={16} color="#F44336" />
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Receipt Analysis</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Icon name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.receiptSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Products:</Text>
              <Text style={styles.summaryValue}>{editedProducts.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={styles.summaryTotal}>{calculateTotal()}</Text>
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>Products List</Text>
          <Text style={styles.sectionSubtitle}>
            Tap on any field to edit
          </Text>
          
          <FlatList
            data={editedProducts}
            renderItem={renderProductItem}
            keyExtractor={(item, index) => `product-${index}`}
            style={styles.productsList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Transactions</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  receiptSummary: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  productsList: {
    maxHeight: 350,
  },
  productItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  productField: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  fieldValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
  },
  productCategory: {
    fontSize: 14,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '500',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  editButton: {
    padding: 8,
    marginLeft: 4,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
  },
  categoryPickerContainer: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#98c5ff',
  },
});

export default ReceiptAnalysisModal;