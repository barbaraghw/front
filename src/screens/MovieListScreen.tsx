// src/screens/MovieListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Image
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'; 
import { RootStackParamList, BottomTabParamList } from '../../App'; 
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';


interface Movie {
  _id: string;
  title: string;
  overview: string;
  release_date: string; // La recibimos como string y la formateamos
  vote_average: number;
  poster_path: string;
  backdrop_path?: string;
  genres: number[]; // Mantendremos IDs de género por ahora
}

type Props = BottomTabScreenProps<BottomTabParamList, 'Movies'>;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const MovieListScreen: React.FC<Props> = ({ navigation }) => { 
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para filtros y ordenamiento
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null); // Puedes tener múltiples
  const [minRating, setMinRating] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [sortBy, setSortBy] = useState<'release_date' | 'vote_average' | 'title'>('release_date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Géneros de TMDB (puedes importarlos de una API de TMDB o hardcodearlos)
  // Para filtrar por nombre de género, necesitarías el ID de TMDB.
  const genres = [
    { id: 28, name: 'Acción' },
    { id: 12, name: 'Aventura' },
    { id: 16, name: 'Animación' },
    { id: 35, name: 'Comedia' },
    { id: 80, name: 'Crimen' },
    { id: 99, name: 'Documental' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Familia' },
    { id: 14, name: 'Fantasía' },
    { id: 36, name: 'Historia' },
    { id: 27, name: 'Terror' },
    { id: 10402, name: 'Música' },
    { id: 9648, name: 'Misterio' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Ciencia ficción' },
    { id: 10770, name: 'Película de TV' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'Bélica' },
    { id: 37, name: 'Western' },
  ];

  const fetchMovies = useCallback(async (refresh = false) => {
    if (!refresh) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        // Redirigir a login si no hay token (manejar en RootStackParamList)
        // navigation.navigate('Login'); // No directamente desde BottomTab
        Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión.');
        return;
      }

      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedGenreId) params.genreId = selectedGenreId;
      if (minRating) params.minRating = minRating;
      if (startYear) params.startYear = startYear;
      if (endYear) params.endYear = endYear;

      params.sortBy = sortBy;
      params.order = sortOrder;

      const response = await axios.get<Movie[]>(`${API_URL}/movies`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setMovies(response.data);
    } catch (error) {
      const axiosError = error as any; // Usar 'any' para errores genéricos de Axios
      Alert.alert('Error', axiosError.response?.data?.message || 'Error al cargar películas.');
      console.error('Error al cargar películas:', axiosError.response?.data || axiosError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedGenreId, minRating, startYear, endYear, sortBy, sortOrder]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMovies(true);
  }, [fetchMovies]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGenreId(null);
    setMinRating('');
    setStartYear('');
    setEndYear('');
    setSortBy('release_date');
    setSortOrder('desc');
  };

  const renderMovieItem = ({ item }: { item: Movie }) => (
    <View style={styles.movieItem}>
      <View style={styles.posterContainer}>
        {item.poster_path ? (
          <Image source={{ uri: item.poster_path }} style={styles.poster} />
        ) : (
          <View style={styles.noPoster}>
            <Text style={styles.noPosterText}>No Poster</Text>
          </View>
        )}
      </View>
      <View style={styles.movieDetails}>
        <Text style={styles.movieTitle}>{item.title}</Text>
        <Text style={styles.movieInfo}>
          Puntuación: {item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}
        </Text>
        <Text style={styles.movieInfo}>
          Lanzamiento: {item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}
        </Text>
        <Text style={styles.movieInfo}>
            Géneros: {item.genres.map(id => genres.find(g => g.id === id)?.name || 'Desconocido').join(', ')}
        </Text>
        <Text style={styles.movieOverview} numberOfLines={3}>{item.overview}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.fullContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Películas</Text>
      </View>

      <ScrollView contentContainerStyle={styles.filtersContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Buscar por título..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Género:</Text>
          <ScrollView horizontal style={styles.genreScroll} showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
                style={[styles.genreButton, selectedGenreId === null && styles.genreButtonSelected]}
                onPress={() => setSelectedGenreId(null)}
            >
                <Text style={[styles.genreButtonText, selectedGenreId === null && styles.genreButtonTextSelected]}>Todos</Text>
            </TouchableOpacity>
            {genres.map(genre => (
                <TouchableOpacity
                    key={genre.id}
                    style={[styles.genreButton, selectedGenreId === genre.id && styles.genreButtonSelected]}
                    onPress={() => setSelectedGenreId(genre.id)}
                >
                    <Text style={[styles.genreButtonText, selectedGenreId === genre.id && styles.genreButtonTextSelected]}>{genre.name}</Text>
                </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TextInput
          style={styles.filterInput}
          placeholder="Puntuación mínima (ej. 7.5)"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={minRating}
          onChangeText={setMinRating}
        />
        <View style={styles.yearInputsContainer}>
          <TextInput
            style={[styles.filterInput, styles.yearInput]}
            placeholder="Año inicio (ej. 2000)"
            placeholderTextColor="#888"
            keyboardType="numeric"
            maxLength={4}
            value={startYear}
            onChangeText={setStartYear}
          />
          <TextInput
            style={[styles.filterInput, styles.yearInput]}
            placeholder="Año fin (ej. 2023)"
            placeholderTextColor="#888"
            keyboardType="numeric"
            maxLength={4}
            value={endYear}
            onChangeText={setEndYear}
          />
        </View>

        <View style={styles.sortingContainer}>
          <Text style={styles.pickerLabel}>Ordenar por:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'release_date' && styles.sortButtonSelected]}
              onPress={() => setSortBy('release_date')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'release_date' && styles.sortButtonTextSelected]}>Fecha</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'vote_average' && styles.sortButtonSelected]}
              onPress={() => setSortBy('vote_average')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'vote_average' && styles.sortButtonTextSelected]}>Puntuación</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'title' && styles.sortButtonSelected]}
              onPress={() => setSortBy('title')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'title' && styles.sortButtonTextSelected]}>Título</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sortOrderButtons}>
            <TouchableOpacity
              style={[styles.sortOrderButton, sortOrder === 'desc' && styles.sortOrderButtonSelected]}
              onPress={() => setSortOrder('desc')}
            >
              <Ionicons name="arrow-down" size={20} color={sortOrder === 'desc' ? '#fff' : '#1E3A8A'} />
              <Text style={[styles.sortOrderButtonText, sortOrder === 'desc' && styles.sortOrderButtonTextSelected]}>Desc</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOrderButton, sortOrder === 'asc' && styles.sortOrderButtonSelected]}
              onPress={() => setSortOrder('asc')}
            >
              <Ionicons name="arrow-up" size={20} color={sortOrder === 'asc' ? '#fff' : '#1E3A8A'} />
              <Text style={[styles.sortOrderButtonText, sortOrder === 'asc' && styles.sortOrderButtonTextSelected]}>Asc</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
          <Text style={styles.clearFiltersButtonText}>Limpiar Filtros</Text>
        </TouchableOpacity>

      </ScrollView>

      {loading && movies.length === 0 ? (
        <ActivityIndicator size="large" color="#1E3A8A" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={movies}
          renderItem={renderMovieItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!loading ? <Text style={styles.emptyListText}>No se encontraron películas.</Text> : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  filtersContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  filterInput: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 10,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  genreScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  genreButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  genreButtonSelected: {
    backgroundColor: '#1E3A8A',
  },
  genreButtonText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  genreButtonTextSelected: {
    color: '#fff',
  },
  yearInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  yearInput: {
    width: '48%',
  },
  sortingContainer: {
    marginBottom: 10,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  sortButtonSelected: {
    backgroundColor: '#1E3A8A',
  },
  sortButtonText: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  sortButtonTextSelected: {
    color: '#fff',
  },
  sortOrderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
  },
  sortOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#fff',
  },
  sortOrderButtonSelected: {
    backgroundColor: '#1E3A8A',
  },
  sortOrderButtonText: {
    color: '#1E3A8A',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  sortOrderButtonTextSelected: {
    color: '#fff',
  },
  clearFiltersButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20, // Espacio al final para evitar que la última película quede oculta por la navegación inferior
    paddingHorizontal: 10,
  },
  movieItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  posterContainer: {
    width: 100,
    height: 150,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noPoster: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosterText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  movieDetails: {
    flex: 1,
    padding: 10,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  movieInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },
  movieOverview: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#888',
  },
});

export default MovieListScreen;