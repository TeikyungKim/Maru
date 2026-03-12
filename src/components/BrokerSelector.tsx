import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { BrokerMeta } from '../brokers/types';

interface BrokerSelectorProps {
  brokers: BrokerMeta[];
  selected?: string;
  onSelect: (key: string) => void;
}

export function BrokerSelector({ brokers, selected, onSelect }: BrokerSelectorProps) {
  return (
    <View style={styles.container}>
      {brokers.map((broker) => {
        const isSelected = selected === broker.key;
        return (
          <TouchableOpacity
            key={broker.key}
            style={[
              styles.card,
              isSelected && styles.cardSelected,
              { borderColor: isSelected ? broker.color : '#e5e7eb' },
            ]}
            onPress={() => onSelect(broker.key)}
            activeOpacity={0.8}
          >
            <View style={[styles.logo, { backgroundColor: broker.color }]}>
              <Text style={styles.logoText}>{broker.logoText}</Text>
            </View>
            <Text style={[styles.name, isSelected && styles.nameSelected]}>
              {broker.name}
            </Text>
            {isSelected && (
              <View style={[styles.checkmark, { backgroundColor: broker.color }]}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    backgroundColor: '#fafafe',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  name: { flex: 1, fontSize: 17, fontWeight: '600', color: '#374151' },
  nameSelected: { color: '#111827', fontWeight: '700' },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
