import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BudgetGroupController } from '../controllers/BudgetGroupController';

// src/components/BudgetGroupSelector.js
const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 12,
    },
    groupItem: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f2f2f2',
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectedGroup: {
        backgroundColor: '#cce5ff',
    },
    groupName: {
        fontSize: 16,
    },
    roleText: {
        fontSize: 12,
        color: '#888',
    },
});

export const BudgetGroupSelector = ({ onGroupChange }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    loadUserGroups();
  }, []);

  const loadUserGroups = async () => {
    try {
      const groupController = new BudgetGroupController();
      const userGroups = await groupController.getUserGroups();
      setGroups([
        { id: 'personal', name: 'Personal Budget', isPersonal: true },
        ...userGroups
      ]);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    onGroupChange(group);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Budget</Text>
      {groups.map(group => (
        <TouchableOpacity
          key={group.id}
          style={[
            styles.groupItem,
            selectedGroup?.id === group.id && styles.selectedGroup
          ]}
          onPress={() => handleGroupSelect(group)}
        >
          <Text style={styles.groupName}>{group.name}</Text>
          {group.user_role && (
            <Text style={styles.roleText}>{group.user_role}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};