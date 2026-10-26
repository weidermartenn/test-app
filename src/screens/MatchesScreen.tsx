import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MATCHES_URL } from '../config';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';

type Team = {
  id: string;
  name: string;
  city: string;
};

type Score = {
  home: number;
  away: number;
};

type Match = {
  id: string;
  startsAt: string | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | string;
  minute?: number;
  home: Team;
  away: Team;
  score: Score | null;
};

type FilterType = 'all' | 'upcoming' | 'finished' | 'favorites';

const STATUS_MAP: Record<string, string> = {
  scheduled: 'Предстоящий',
  live: 'Идет',
  finished: 'Завершён',
  postponed: 'Перенесён',
};

export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [round, setRound] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { isFavorite, toggle } = useFavorites();

  const fetchMatches = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const response = await fetch(MATCHES_URL);
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      const data = await response.json();
      
      // Сервер возвращает объект { round, matches }
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      if (data.round) setRound(data.round);
      
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить матчи');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMatches(true);
  }, []);

  const filteredMatches = matches.filter((match) => {
    if (filter === 'upcoming') {
      return match.status === 'scheduled';
    }
    if (filter === 'finished') {
      return match.status === 'finished';
    }
    if (filter === 'favorites') {
      return isFavorite(match.id);
    }
    return true; // 'all' включает все статусы (live, postponed и т.д.)
  });

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Время уточняется';
    try {
      const date = new Date(isoString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return isoString;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ef3124" />
        <Text style={styles.loadingText}>Загрузка матчей...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchMatches()}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Матчи тура {round ? `${round}` : ''}
        </Text>
        <UpdatedAgo since={lastUpdated} />
      </View>

      {/* Фильтры */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Все</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Предстоящие
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'finished' && styles.filterButtonActive]}
          onPress={() => setFilter('finished')}
        >
          <Text style={[styles.filterText, filter === 'finished' && styles.filterTextActive]}>
            Завершённые
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'favorites' && styles.filterButtonActive]}
          onPress={() => setFilter('favorites')}
        >
          <Text style={[styles.filterText, filter === 'favorites' && styles.filterTextActive]}>
            Избранное
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ef3124']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'favorites' ? 'Нет избранных матчей' : 'Матчи не найдены'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const hasScore = item.score !== null && item.score !== undefined;
          let statusText = STATUS_MAP[item.status] || item.status;
          
          if (item.status === 'live' && item.minute) {
            statusText = `Идет (${item.minute}')`;
          }

          const favorite = isFavorite(item.id);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.statusText}>{statusText}</Text>
                <FavoriteButton active={favorite} onPress={() => toggle(item.id)} />
              </View>
              <View style={styles.teamsRow}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {item.home.name}
                </Text>
                <Text style={styles.score}>
                  {hasScore ? `${item.score?.home} : ${item.score?.away}` : 'vs'}
                </Text>
                <Text style={[styles.teamName, styles.awayTeamName]} numberOfLines={1}>
                  {item.away.name}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDate(item.startsAt)}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  errorText: {
    color: '#ef3124',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#ef3124',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 3,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  filterText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#111818',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  awayTeamName: {
    textAlign: 'right',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111818',
    marginHorizontal: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
});