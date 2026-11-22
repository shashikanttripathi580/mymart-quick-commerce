import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Category } from '@mymart/shared';

interface CategoryPillProps {
  category: Category;
  isSelected?: boolean;
  onPress: () => void;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  isSelected = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, isSelected && styles.selectedContainer]}
    >
      <View style={[styles.imageWrapper, isSelected && styles.selectedImageWrapper]}>
        <Image
          source={{ uri: category.image_url }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
      <Text
        style={[styles.label, isSelected && styles.selectedLabel]}
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 72,
    marginRight: 10,
    marginBottom: 8,
  },
  selectedContainer: {
    transform: [{ scale: 1.05 }],
  },
  imageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedImageWrapper: {
    borderColor: '#16a34a',
    borderWidth: 2.5,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 13,
  },
  selectedLabel: {
    color: '#16a34a',
    fontWeight: '900',
  },
});
