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
    Dimensions,
    StatusBar,
    Platform, // Import StatusBar for setting its style
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

    const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
    const [loadingLatest, setLoadingLatest] = useState(true);
    const [loadingPopular, setLoadingPopular] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
    const [minRating, setMinRating] = useState('');
    const [startYear, setStartYear] = useState('');
    const [endYear, setEndYear] = useState('');
    const [sortBy, setSortBy] = useState<'release_date' | 'vote_average' | 'title'>('release_date');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const [selectedCategory, setSelectedCategory] = useState('All');

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
                console.log('Fetched userName:', storedName);
                setUserName(storedName);
            } else {
                console.log('Fetched userName: null');
                setUserName(null);
            }
        } catch (error) {
            console.error('Error fetching username from AsyncStorage:', error);
            setUserName(null);
        }
    }

    const fetchMoviesSection = useCallback(async (
        type: 'latest' | 'popular' | 'category' | 'genre' | 'all',
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
            } else if (type === 'category' || type === 'genre') {
                if (currentGenreId) {
                    params.genreId = currentGenreId;
                }
                params.sortBy = 'release_date';
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
            return () => {
                // Optional: cleanup logic
            };
        }, [])
    );
    useFocusEffect(
        useCallback(() => {
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
                if (currentRouteParams.type !== 'latest') setLatestMovies([]);
                if (currentRouteParams.type !== 'popular') setPopularMovies([]);
            } else if ('name' in route && route.name === 'Movies') {
                fetchMoviesSection('latest', setLatestMovies, setLoadingLatest);
                fetchMoviesSection('popular', setPopularMovies, setLoadingPopular);
            }
        }, [route, fetchMoviesSection])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            fetchAndSetUserName(),
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
    const moviesToDisplayForSeeAll = isSeeAllView ? (
        route.params?.type === 'latest' ? latestMovies :
            route.params?.type === 'popular' ? popularMovies :
                latestMovies // Default fallback if type is unknown or 'all'
    ) : [];

    return (
        // Apply SafeAreaView to the entire screen
        <SafeAreaView style={styles.fullContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" /> {/* Set background color for status bar */}
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
                                        {userName || 'Guest'}
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
                    loadingLatest || loadingPopular ? (
                        <ActivityIndicator size="large" color="#E50914" style={styles.loadingIndicator} />
                    ) : (
                        <FlatList
                            data={moviesToDisplayForSeeAll}
                            renderItem={renderMovieCard}
                            keyExtractor={(item) => item._id}
                            numColumns={numColumns}
                            contentContainerStyle={styles.flatListContent}
                            scrollEnabled={false} // Nested FlatList should not scroll itself
                            ListEmptyComponent={
                                <View style={styles.emptyListContainer}>
                                    <Text style={styles.emptyListText}>No movies found in this category.</Text>
                                </View>
                            }
                        />
                    )
                ) : (
                    <>
                        {/* Latest Movies Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Latest Movies</Text>
                            <TouchableOpacity onPress={() => rootStackNavigation.navigate('MovieList', { type: 'latest' })}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        {loadingLatest ? (
                            <ActivityIndicator size="small" color="#E50914" style={styles.loadingIndicator} />
                        ) : (
                            <FlatList
                                data={latestMovies}
                                renderItem={renderMovieCard}
                                keyExtractor={(item) => item._id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.horizontalMovieList}
                                ListEmptyComponent={
                                    <View style={styles.emptyHorizontalListContainer}>
                                        <Text style={styles.emptyListText}>No latest movies available.</Text>
                                    </View>
                                }
                            />
                        )}

                        {/* Popular Movies Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Popular Movies</Text>
                            <TouchableOpacity onPress={() => rootStackNavigation.navigate('MovieList', { type: 'popular' })}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        {loadingPopular ? (
                            <ActivityIndicator size="small" color="#E50914" style={styles.loadingIndicator} />
                        ) : (
                            <FlatList
                                data={popularMovies}
                                renderItem={renderMovieCard}
                                keyExtractor={(item) => item._id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.horizontalMovieList}
                                ListEmptyComponent={
                                    <View style={styles.emptyHorizontalListContainer}>
                                        <Text style={styles.emptyListText}>No popular movies available.</Text>
                                    </View>
                                }
                            />
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A', // Ensure this covers the entire safe area
    },
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        // No explicit padding here, SafeAreaView handles it
    },
    loadingIndicator: {
        marginTop: 50,
        marginBottom: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#1C1C1C',
        // No paddingTop here, SafeAreaView will push it down
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
        borderWidth: 1,
        borderColor: '#555',
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
        padding: 5,
    },
    discoverTitle: {
        color: '#FFF',
        fontSize: 30,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 20,
    },
    categoryFilterContainer: {
        marginBottom: 20,
    },
    categoryFilterContent: {
        paddingHorizontal: 20,
    },
    categoryButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
        marginRight: 10,
        backgroundColor: '#222',
    },
    selectedCategoryButton: {
        backgroundColor: '#E50914',
        borderColor: '#E50914',
    },
    categoryButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    selectedCategoryButtonText: {
        color: '#FFF',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
    },
    seeAllText: {
        color: '#E50914',
        fontSize: 16,
        fontWeight: 'bold',
    },
    horizontalMovieList: {
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    movieCardHorizontal: {
        width: 120, // Adjust size for horizontal cards
        marginHorizontal: 5,
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    movieCardVertical: {
        marginHorizontal: cardMargin / 2,
        marginBottom: cardMargin,
        alignItems: 'flex-start',
    },
    moviePoster: {
        width: '100%',
        height: 180, // Aspect ratio 2:3 for posters
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#333',
        marginBottom: 8,
    },
    movieTitleCard: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'left',
        width: '100%',
        height: 40, // Fixed height for two lines
    },
    movieInfoCard: {
        color: '#A0A0A0',
        fontSize: 12,
        textAlign: 'left',
        width: '100%',
    },
    flatListContent: {
        paddingHorizontal: cardMargin / 2,
        paddingBottom: Platform.OS === 'ios' ? 0 : 20, // Add padding bottom for Android in See All view
        justifyContent: 'flex-start',
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyListText: {
        color: '#A0A0A0',
        fontSize: 16,
    },
    emptyHorizontalListContainer: {
        width: Dimensions.get('window').width - 40, // Take up most of the screen width
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    }
});

export default MovieListScreen;