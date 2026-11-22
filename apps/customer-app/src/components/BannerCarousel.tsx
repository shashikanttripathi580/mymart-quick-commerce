import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Promotion } from '@mymart/shared';

interface BannerCarouselProps {
  promotions: Promotion[];
  onSelectPromotion?: (promo: Promotion) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  promotions,
  onSelectPromotion,
}) => {
  if (!promotions || promotions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + 14}
      decelerationRate="fast"
      contentContainerStyle={styles.container}
    >
      {promotions.map((promo) => (
        <TouchableOpacity
          key={promo.id}
          activeOpacity={0.9}
          onPress={() => onSelectPromotion && onSelectPromotion(promo)}
          style={styles.card}
        >
          <Image
            source={{ uri: promo.banner_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.gradientOverlay} />
          <View style={styles.content}>
            <Text style={styles.tag}>LIMITED TIME</Text>
            <Text style={styles.title} numberOfLines={1}>
              {promo.title}
            </Text>
            {promo.description && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {promo.description}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 20,
    marginRight: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
  },
  tag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#86efac',
    backgroundColor: 'rgba(22, 163, 74, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#e2e8f0',
    marginTop: 2,
  },
});
