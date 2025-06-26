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
    Image,
    Dimensions
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, BottomTabParamList } from '../../App';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native'; 

interface Movie {
    _id: string;
    title: string;
    overview: string;
    release_date: string;
    vote_average: number;
    poster_path: string;
    backdrop_path?: string;
    genres: number[];
    runtime?: number;
}

interface IAuthenticatedUser {
    _id: string;
    username: string;
    email: string;
}

type MovieListTabProps = CompositeScreenProps<
    BottomTabScreenProps<BottomTabParamList, 'Movies'>,
    NativeStackScreenProps<RootStackParamList>
>;

type MovieListStackProps = NativeStackScreenProps<RootStackParamList, 'MovieList'>;

type MovieListScreenProps = MovieListTabProps | MovieListStackProps;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';
const windowWidth = Dimensions.get('window').width;
const numColumns = 2;
const cardMargin = 15;
const cardWidth = (windowWidth - (numColumns + 1) * cardMargin) / numColumns;

const MovieListScreen: React.FC<MovieListScreenProps> = ({ navigation, route }) => {
    const rootStackNavigation = navigation as NativeStackNavigationProp<RootStackParamList>;
const [userName, setUserName] = useState<string | null>(null);
    const [latestMovies, setLatestMovies] = useState<Movie[]>([]);

    // --- CAMBIO: Reemplazar 'upcoming' por 'popular' ---
    const [popularMovies, setPopularMovies] = useState<Movie[]>([]); // Nuevo estado para películas populares
    const [loadingLatest, setLoadingLatest] = useState(true);
    const [loadingPopular, setLoadingPopular] = useState(true); // Nuevo estado de carga para populares
    // --- FIN CAMBIO ---

    const [refreshing, setRefreshing] = useState(false);

    // Keep these if they are used elsewhere for general filtering/sorting UI
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
    const [minRating, setMinRating] = useState('');
    const [startYear, setStartYear] = useState('');
    const [endYear, setEndYear] = useState('');
    const [sortBy, setSortBy] = useState<'release_date' | 'vote_average' | 'title'>('release_date');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const [selectedCategory, setSelectedCategory] = useState('All');


    // Make sure your genres array does NOT have duplicates (as per previous fix)
    const genres = [
        { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' },
        { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 18, name: 'Drama' },
        { id: 878, name: 'Science Fiction' },
        { id: 53, name: 'Thriller' },
        { id: 27, name: 'Horror' },
        { id: 99, name: 'Documentary' }, { id: 10751, name: 'Family' }, { id: 14, name: 'Fantasy' },
        { id: 36, name: 'History' }, { id: 10402, name: 'Music' }, { id: 9648, name: 'Mystery' },
        { id: 10749, name: 'Romance' },
        { id: 10770, name: 'TV Movie' },
        { id: 10752, name: 'War' }, { id: 37, name: 'Western' }
    ];
    const categories = ['All', ...genres.map(g => g.name)];

    const userAvatar = require('../../assets/user_avatar.png');

  const fetchAndSetUserName = async () => {
        try {
            const storedName = await AsyncStorage.getItem('userName');
            if (storedName) {
                console.log('Fetched userName:', storedName); // This log confirms it's retrieved
                setUserName(storedName); // <--- Make sure this line exists and is called
            } else {
                console.log('Fetched userName: null');
                setUserName(null); // Clear if not found
            }
        } catch (error) {
            console.error('Error fetching username from AsyncStorage:', error);
            setUserName(null);
        }
    }

    const fetchMoviesSection = useCallback(async (
        type: 'latest' | 'popular' | 'category' | 'genre' | 'all', // Updated type parameter
        setter: React.Dispatch<React.SetStateAction<Movie[]>>,
        setLoading: React.Dispatch<React.SetStateAction<boolean>>,
        currentGenreId: number | null = null
    ) => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión.');
                rootStackNavigation.navigate('Login');
                return;
            }

            const params: any = {};
            
            if (type === 'latest') {
                params.type = 'latest';
                params.sortBy = 'release_date';
                params.order = 'desc';
            } else if (type === 'popular') {
                params.type = 'popular';
                // Backend handles sorting for 'popular', no need for sortBy/order here
            } else if (type === 'category' || type === 'genre') {
                if (currentGenreId) {
                    params.genreId = currentGenreId;
                }
                params.sortBy = 'release_date'; // Default sort for category/genre
                params.order = 'desc';
            } else { // 'all' or default
                params.sortBy = 'release_date';
                params.order = 'desc';
            }
            
            const response = await axios.get<Movie[]>(`${API_URL}/movies`, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });
            setter(response.data);
        } catch (error) {
            const axiosError = error as any;
            Alert.alert('Error', axiosError.response?.data?.message || `Error al cargar películas de tipo ${type}.`);
            console.error(`Error al cargar películas de tipo ${type}:`, axiosError.response?.data || axiosError.message);
            setter([]);
        } finally {
            setLoading(false);
        }
      }, [rootStackNavigation]);
 useFocusEffect(
        React.useCallback(() => {
            fetchAndSetUserName();
            // You can return a cleanup function if needed
            return () => {
                // Optional: cleanup logic
            };
        }, []) // The empty dependency array ensures it only runs once per focus
    );
      useFocusEffect(
        useCallback(() => {// **ESSENTIAL**: Fetch username on screen focus
            // Determine which movies to fetch based on the current route
            if ('name' in route && route.name === 'MovieList' && route.params) {
                const currentRouteParams = route.params as RootStackParamList['MovieList'];
                if (currentRouteParams.type === 'latest') {
                    fetchMoviesSection('latest', setLatestMovies, setLoadingLatest);
                } else if (currentRouteParams.type === 'popular') {
                    fetchMoviesSection('popular', setPopularMovies, setLoadingPopular);
                } else if (currentRouteParams.type === 'category' || currentRouteParams.type === 'genre') {
                    const genreId = currentRouteParams.genreId || (currentRouteParams.category ? genres.find(g => g.name === currentRouteParams.category)?.id : null);
                    fetchMoviesSection('category', setLatestMovies, setLoadingLatest, genreId);
                } else {
                    fetchMoviesSection('all', setLatestMovies, setLoadingLatest);
                }
                // Clear other lists if in a specific list view
                if (currentRouteParams.type !== 'latest') setLatestMovies([]);
                if (currentRouteParams.type !== 'popular') setPopularMovies([]);
            } else if ('name' in route && route.name === 'Movies') { // This is the main tab screen
                fetchMoviesSection('latest', setLatestMovies, setLoadingLatest);
                fetchMoviesSection('popular', setPopularMovies, setLoadingPopular);
            }
        }, [route, fetchMoviesSection]) // Dependencies for useFocusEffect
    ); // fetchUserData es ahora una dependencia estable

     const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Re-fetch all relevant data
        Promise.all([
            fetchAndSetUserName(), // Refresh username
            // Logic to re-fetch based on current route
            (() => {
                if ('name' in route && route.name === 'MovieList' && route.params) {
                    const currentRouteParams = route.params as RootStackParamList['MovieList'];
                    if (currentRouteParams.type === 'latest') {
                        return fetchMoviesSection('latest', setLatestMovies, setLoadingLatest);
                    } else if (currentRouteParams.type === 'popular') {
                        return fetchMoviesSection('popular', setPopularMovies, setLoadingPopular);
                    } else if (currentRouteParams.type === 'category' || currentRouteParams.type === 'genre') {
                        const genreId = currentRouteParams.genreId || (currentRouteParams.category ? genres.find(g => g.name === currentRouteParams.category)?.id : null);
                        return fetchMoviesSection('category', setLatestMovies, setLoadingLatest, genreId);
                    } else {
                        return fetchMoviesSection('all', setLatestMovies, setLoadingLatest);
                    }
                } else {
                    return Promise.all([
                        fetchMoviesSection('latest', setLatestMovies, setLoadingLatest),
                        fetchMoviesSection('popular', setPopularMovies, setLoadingPopular),
                    ]);
                }
            })(),
        ]).finally(() => setRefreshing(false));
    }, [fetchAndSetUserName, fetchMoviesSection, route]);

// fetchUserData es ahora una dependencia estable

    const renderMovieCard = ({ item }: { item: Movie }) => (
        <TouchableOpacity
            style={
                'name' in route && route.name === 'MovieList'
                    ? [styles.movieCardVertical, { width: cardWidth }]
                    : styles.movieCardHorizontal
            }
            onPress={() => rootStackNavigation.navigate('MovieDetail', { movieId: item._id, movieTitle: item.title })}
        >
            <Image
                source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
                style={styles.moviePoster}
                resizeMode="cover"
            />
            <Text style={styles.movieTitleCard} numberOfLines={2}>{item.title}</Text>
            {item.runtime ? (
                <Text style={styles.movieInfoCard}>{`${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m`}</Text>
            ) : item.release_date ? (
                <Text style={styles.movieInfoCard}>{new Date(item.release_date).getFullYear()}</Text>
            ) : null}
        </TouchableOpacity>
    );

    const isSeeAllView = 'name' in route && route.name === 'MovieList';
    // --- CAMBIO: Determinar qué lista mostrar en "See all" ---
    const moviesToDisplayForSeeAll = isSeeAllView ? (
        route.params?.type === 'latest' ? latestMovies :
        route.params?.type === 'popular' ? popularMovies :
        latestMovies // Default fallback if type is unknown or 'all'
    ) : [];
    // --- FIN CAMBIO ---

    return (
        <SafeAreaView style={styles.fullContainer}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
                }
            >
                {!isSeeAllView && (
                    <>
                        <View style={styles.header}>
                            <View style={styles.userInfo}>
                                <Image source={userAvatar} style={styles.avatar} />
                                <View>
                                    <Text style={styles.welcomeText}>Welcome back,</Text>
                                    <Text style={styles.userName}>
                                      {userName || 'Guest'} {/* <--- CHANGE THIS LINE */}
                                  </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.searchIconContainer}
                                onPress={() => rootStackNavigation.navigate('SearchScreen')}
                            >
                                <FontAwesome5 name="search" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.discoverTitle}>Discover Your Next{"\n"}Favorite Movie.</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterContainer} contentContainerStyle={styles.categoryFilterContent}>
                            {categories.map((categoryName) => (
                                <TouchableOpacity
                                    key={categoryName}
                                    style={[
                                        styles.categoryButton,
                                        selectedCategory === categoryName && styles.selectedCategoryButton,
                                    ]}
                                    onPress={() => setSelectedCategory(categoryName)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryButtonText,
                                            selectedCategory === categoryName && styles.selectedCategoryButtonText,
                                        ]}
                                    >
                                        {categoryName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {isSeeAllView ? (
                    // --- CAMBIO: Check loading states for both latest and popular ---
                    loadingLatest || loadingPopular ? (
                        <ActivityIndicator size="large" color="#E50914" style={styles.loadingIndicator} />
                    ) : (
                    // --- FIN CAMBIO ---
                        <FlatList
                            data={moviesToDisplayForSeeAll.length > 0 ? moviesToDisplayForSeeAll : latestMovies} // Default if no specific type
                            renderItem={renderMovieCard}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.movieListVerticalContent}
                            ListEmptyComponent={<Text style={styles.emptyListText}>No se encontraron películas.</Text>}
                            numColumns={numColumns}
                            columnWrapperStyle={styles.row}
                        />
                    )
                ) : (
                    <>
                        {/* Latest Movies Section (unchanged) */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Latest movies</Text>
                            <TouchableOpacity onPress={() =>
                                rootStackNavigation.navigate('MovieList', { type: 'latest', sortBy: 'release_date', sortOrder: 'desc' })
                            }>
                                <Text style={styles.seeAllText}>See all</Text>
                            </TouchableOpacity>
                        </View>
                        {loadingLatest ? (
                            <ActivityIndicator size="large" color="#E50914" style={styles.loadingIndicator} />
                        ) : (
                            <FlatList
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                data={latestMovies}
                                renderItem={renderMovieCard}
                                keyExtractor={(item) => item._id}
                                contentContainerStyle={styles.movieListHorizontalContent}
                                ListEmptyComponent={<Text style={styles.emptyListText}>No se encontraron películas recientes.</Text>}
                            />
                        )}

                        {/* --- CAMBIO: Popular Movies Section (previously Upcoming) --- */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Popular movies</Text> {/* Updated title */}
                            <TouchableOpacity onPress={() =>
                                rootStackNavigation.navigate('MovieList', { type: 'popular' }) // Navigate with 'popular' type
                            }>
                                <Text style={styles.seeAllText}>See all</Text>
                            </TouchableOpacity>
                        </View>
                        {loadingPopular ? ( // Use loadingPopular state
                            <ActivityIndicator size="large" color="#E50914" style={styles.loadingIndicator} />
                        ) : (
                            <FlatList
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                data={popularMovies} // Use popularMovies data
                                renderItem={renderMovieCard}
                                keyExtractor={(item) => item._id}
                                contentContainerStyle={styles.movieListHorizontalContent}
                                ListEmptyComponent={<Text style={styles.emptyListText}>No se encontraron películas populares.</Text>}
                            />
                        )}
                        {/* --- FIN CAMBIO --- */}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#333',
    },
    welcomeText: {
        color: '#A0A0A0',
        fontSize: 14,
    },
    userName: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchIconContainer: {
        padding: 8,
    },
    discoverTitle: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 30,
        lineHeight: 40,
    },
    categoryFilterContainer: {
        marginBottom: 25,
    },
    categoryFilterContent: {
        alignItems: 'center',
        paddingRight: 10,
    },
    categoryButton: {
        backgroundColor: '#262626',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 18,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#262626',
    },
    selectedCategoryButton: {
        backgroundColor: '#E50914',
        borderColor: '#E50914',
    },
    categoryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    selectedCategoryButtonText: {
        color: '#FFF',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 20,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
    },
    seeAllText: {
        color: '#E50914',
        fontSize: 16,
        fontWeight: '500',
    },
    movieListHorizontalContent: {
        paddingBottom: 20,
    },
    movieCardHorizontal: {
        width: 120,
        marginRight: 15,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#1C1C1C',
        height: 220,
        paddingBottom: 5,
    },
    movieListVerticalContent: {
        paddingVertical: 10,
        paddingHorizontal: cardMargin / 2,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: cardMargin,
    },
    movieCardVertical: {
        width: cardWidth,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#1C1C1C',
        height: 280,
        marginBottom: 0,
    },
    moviePoster: {
        width: '100%',
        height: 160,
        borderRadius: 8,
    },
    movieTitleCard: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 8,
        paddingHorizontal: 5,
        textAlign: 'center',
    },
    movieInfoCard: {
        color: '#A0A0A0',
        fontSize: 12,
        paddingHorizontal: 5,
        textAlign: 'center',
        marginTop: 2,
    },
    loadingIndicator: {
        marginTop: 50,
        marginBottom: 50,
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#A0A0A0',
        width: '100%',
    },
});

export default MovieListScreen;