import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSearch } from '@/features/search/hooks';
import { StockCard } from '@/components/StockCard';

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'stock', label: '주식' },
  { key: 'etf', label: 'ETF' },
] as const;

export default function SearchScreen() {
  const router = useRouter();
  const { keyword, results, filter, isSearching, error, search, changeFilter } = useSearch();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>종목 검색</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={keyword}
            onChangeText={search}
            placeholder="종목명 또는 코드 입력"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            autoCorrect={false}
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => search('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => changeFilter(f.key)}
            >
              <Text
                style={[styles.filterText, filter === f.key && styles.filterTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isSearching ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : results.length === 0 && keyword ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
        </View>
      ) : keyword === '' ? (
        <View style={styles.center}>
          <Text style={styles.hintText}>종목명 또는 코드로 검색하세요</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <StockCard
              mode="search"
              item={item}
              onPress={() =>
                router.push(
                  item.type === 'etf'
                    ? `/(main)/etf/${item.code}`
                    : `/(main)/stock/${item.code}`
                )
              }
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#1a1a2e', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  clearBtn: { fontSize: 16, color: '#9ca3af', paddingHorizontal: 4 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterBtnActive: { backgroundColor: '#4f46e5' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  hintText: { fontSize: 15, color: '#9ca3af' },
  errorText: { fontSize: 15, color: '#dc2626' },
});
