import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Platform,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, BottomTabParamList } from '../../App';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://back-azq9.onrender.com/api';
const windowWidth = Dimensions.get('window').width;
const numColumns = 2;
const cardMargin = 10;
const cardWidth = 150;
const verticalCardMargin = 10;
const MovieListScreen: React.FC<MovieListScreenProps> = ({ navigation, route }) => {
    const rootStackNavigation = navigation as NativeStackNavigationProp<RootStackParamList>;
    const [userName, setUserName] = useState<string | null>(null);

    const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
    const [popularMovies, setPopularMovies] = useState<Movie[]>([]);

    const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
    const [loadingFiltered, setLoadingFiltered] = useState(false);

    const [loadingLatest, setLoadingLatest] = useState(true);
    const [loadingPopular, setLoadingPopular] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenreName, setSelectedGenreName] = useState('All');
    const [minRating, setMinRating] = useState('');
    const [startYear, setStartYear] = useState('');
    const [endYear, setEndYear] = useState('');
    const [sortBy, setSortBy] = useState<'release_date' | 'vote_average'>('release_date');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [showFilters, setShowFilters] = useState(false);

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
                setUserName(storedName);
            } else {
                setUserName(null);
            }
        } catch (error) {
            console.error('Error fetching username from AsyncStorage:', error);
            setUserName(null);
        }
    }

    const fetchMoviesSection = useCallback(async (
        type: 'latest' | 'popular',
        setter: React.Dispatch<React.SetStateAction<Movie[]>>,
        setLoading: React.Dispatch<React.SetStateAction<boolean>>,
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
                params.sortBy = 'release_date';
                params.order = 'desc';
            } else if (type === 'popular') {
                params.sortBy = 'vote_average'; // Popular usually sorted by vote_average
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

    // This useCallback function encapsulates the logic for fetching filtered movies.
    // Its dependencies are the filter states themselves.
    const fetchFilteredMovies = useCallback(async () => {
        setLoadingFiltered(true);
        setFilteredMovies([]); // Clear previous filtered movies immediately

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión.');
                rootStackNavigation.navigate('Login');
                return;
            }

            const params: any = {};

            if (searchQuery.trim() !== '') {
                params.search = searchQuery.trim();
            }

            if (selectedGenreName !== 'All') {
                const genre = genres.find(g => g.name === selectedGenreName);
                if (genre) {
                    params.genreId = genre.id;
                    console.log(`[DEBUG] Filtering by genre: ${genre.name} (ID: ${genre.id})`);
                } else {
                    console.warn(`[DEBUG] Genre '${selectedGenreName}' not found in local list.`);
                }
            }

            const parsedMinRating = parseFloat(minRating);
            if (!isNaN(parsedMinRating) && parsedMinRating >= 0 && parsedMinRating <= 10) {
                params.minRating = parsedMinRating;
            }

            const parsedStartYear = parseInt(startYear);
            const parsedEndYear = parseInt(endYear);

            if (!isNaN(parsedStartYear) && parsedStartYear > 0) {
                params.startYear = parsedStartYear;
            }
            if (!isNaN(parsedEndYear) && parsedEndYear > 0) {
                params.endYear = parsedEndYear;
            }

            params.sortBy = sortBy;
            params.order = sortOrder;

            console.log("[DEBUG] Fetching with params:", params);

            const response = await axios.get<Movie[]>(`${API_URL}/movies`, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });
            console.log(`[DEBUG] Received ${response.data.length} movies with filters.`);
            setFilteredMovies(response.data);
        } catch (error) {
            const axiosError = error as any;
            Alert.alert('Error', axiosError.response?.data?.message || `Error al cargar películas con los filtros.`);
            console.error(`Error al cargar películas con filtros:`, axiosError.response?.data || axiosError.message);
            setFilteredMovies([]);
        } finally {
            setLoadingFiltered(false);
        }
    }, [rootStackNavigation, searchQuery, selectedGenreName, minRating, startYear, endYear, sortBy, sortOrder]);


    // Ref to prevent unnecessary re-fetches when navigating back to 'MovieList' with same params
    // For the main Movies tab, we'll use a boolean to indicate initial load
       const initialMovieListLoadRef = useRef<{ type?: string; category?: string; genreId?: number } | boolean>(false); // Changed to boolean for main tab

    // useFocusEffect for initial data load based on route (main tab or 'See All' screen)
    useFocusEffect(
        useCallback(() => {
            fetchAndSetUserName();

            const isMainMoviesTab = ('name' in route && route.name === 'Movies');
            const isMovieListRoute = ('name' in route && route.name === 'MovieList');
            const currentRouteParams = isMovieListRoute ? (route.params as RootStackParamList['MovieList']) : null;

            // Determine if the route parameters have genuinely changed for 'MovieList'
            const hasRouteParamsChanged = isMovieListRoute && (
                currentRouteParams?.type !== (initialMovieListLoadRef.current as any)?.type ||
                currentRouteParams?.category !== (initialMovieListLoadRef.current as any)?.category ||
                currentRouteParams?.genreId !== (initialMovieListLoadRef.current as any)?.genreId
            );

            // Logic for 'MovieList' (See All) screens
            if (isMovieListRoute && currentRouteParams) {
                // Only proceed if params have changed or it's an initial load for this specific MovieList type
                if (hasRouteParamsChanged || typeof initialMovieListLoadRef.current === 'boolean') {
                    console.log(`[DEBUG] MovieList route focus effect triggered with params change or initial load.`);
                    setLatestMovies([]); // Clear other lists
                    setPopularMovies([]);
                    setFilteredMovies([]); // Also clear filtered movies if navigating to specific type list

                    if (currentRouteParams.type === 'latest') {
                        fetchMoviesSection('latest', setLatestMovies, setLoadingLatest);
                    } else if (currentRouteParams.type === 'popular') {
                        fetchMoviesSection('popular', setPopularMovies, setLoadingPopular);
                    } else { // Handle 'category' or 'genre' or generic 'MovieList' for filtered content
                        const genreNameFromParam = currentRouteParams.category || genres.find(g => g.id === currentRouteParams.genreId)?.name;
                        if (genreNameFromParam) {
                            setSelectedGenreName(genreNameFromParam);
                        } else {
                            setSelectedGenreName('All');
                        }
                        // Do NOT call fetchFilteredMovies() here. The combined useEffect below will handle it
                        // when selectedGenreName or other filter states change.
                    }
                    // Update the ref to prevent re-fetching on subsequent identical focuses
                    initialMovieListLoadRef.current = {
                        type: currentRouteParams.type,
                        category: currentRouteParams.category,
                        genreId: currentRouteParams.genreId
                    };
                } else {
                    console.log(`[DEBUG] MovieList route focus effect triggered, but params are same. Not refetching.`);
                }
            } else if (isMainMoviesTab && initialMovieListLoadRef.current === false) { // ONLY fetch on initial mount of main tab
                console.log(`[DEBUG] Main Movies tab focus effect triggered for initial load.`);
                fetchMoviesSection('latest', setLatestMovies, setLoadingLatest);
                fetchMoviesSection('popular', setPopularMovies, setLoadingPopular);
                // fetchFilteredMovies(); // <--- This was commented out before, keeping it that way.
                                         // The combined useEffect below will handle fetching filtered movies
                                         // based on default filter states for the main tab.
                initialMovieListLoadRef.current = true; // Mark as loaded for main tab
            } else {
                console.log(`[DEBUG] Focus effect triggered, but no relevant route change or initial load for current view.`);
            }

            // Cleanup for useFocusEffect - reset ref when component blurs
            return () => {
                // If it's a MovieList route, we clear the ref on blur so it re-fetches if re-focused
                // with potentially different params (e.g., if you navigate to another MovieList)
                // For the main tab, we don't reset it to false here, as its initial load is persistent.
                if (isMovieListRoute) {
                    initialMovieListLoadRef.current = false; // Reset to false for MovieList route when leaving
                }
            };
        }, [
        ])
    );

    // COMBINED useEffect for all filter changes (text, category, sort)
    // This will trigger fetchFilteredMovies when ANY of these filter states change.
    // It applies debouncing to prevent excessive API calls during rapid text input.
    useEffect(() => {
        const isMainMoviesTab = ('name' in route && route.name === 'Movies');
        const isMovieListRoute = ('name' in route && route.name === 'MovieList');
        const currentRouteParams = isMovieListRoute ? (route.params as RootStackParamList['MovieList']) : null;

        // Condition to decide if filtered movies should be fetched:
        // 1. It's the main 'Movies' tab.
        // 2. OR it's the 'MovieList' route, AND it's NOT a 'latest' or 'popular' specific list.
        const shouldFetchFiltered = isMainMoviesTab || (isMovieListRoute && !currentRouteParams?.type);

        if (shouldFetchFiltered) {
            console.log(`[DEBUG] Filter state changed, triggering fetchFilteredMovies (debounced for text inputs).`);
            const handler = setTimeout(() => {
                fetchFilteredMovies();
            }, 300); // Debounce for 300ms

            return () => clearTimeout(handler);
        } else {
            console.log(`[DEBUG] Not fetching filtered movies: isMainMoviesTab=${isMainMoviesTab}, isMovieListRoute=${isMovieListRoute}, currentRouteParams?.type=${currentRouteParams?.type}`);
        }
    }, [
        searchQuery,
        selectedGenreName, // Category changes
        minRating,
        startYear,
        endYear,
        sortBy, // Sort changes
        sortOrder, // Sort changes
        fetchFilteredMovies, // fetchFilteredMovies is a useCallback, so its reference is stable unless its dependencies change.
        route // To determine if it's the main tab or a specific MovieList route
    ]);


    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAndSetUserName().then(() => {
            const isMovieListRoute = ('name' in route && route.name === 'MovieList');
            const currentRouteParams = isMovieListRoute ? (route.params as RootStackParamList['MovieList']) : null;

            if (isMovieListRoute && currentRouteParams) {
                if (currentRouteParams.type === 'latest') {
                    return fetchMoviesSection('latest', setLatestMovies, setLoadingLatest).finally(() => setRefreshing(false));
                } else if (currentRouteParams.type === 'popular') {
                    return fetchMoviesSection('popular', setPopularMovies, setLoadingPopular).finally(() => setRefreshing(false));
                } else {
                    const genreNameFromParam = currentRouteParams.category || genres.find(g => g.id === currentRouteParams.genreId)?.name;
                    if (genreNameFromParam) {
                        setSelectedGenreName(genreNameFromParam);
                    } else {
                        setSelectedGenreName('All');
                    }
                    // The combined useEffect will handle the fetch due to state change
                    // No need to return fetchFilteredMovies() here
                    setRefreshing(false); // Set false here as the fetch will be handled by useEffect
                }
            } else {
                // Main 'Movies' tab
                Promise.all([
                    fetchMoviesSection('latest', setLatestMovies, setLoadingLatest),
                    fetchMoviesSection('popular', setPopularMovies, setLoadingPopular),
                    fetchFilteredMovies(), // Re-fetch filtered movies for the main tab as well
                ]).finally(() => setRefreshing(false));
            }
        });
    }, [fetchAndSetUserName, fetchMoviesSection, fetchFilteredMovies, route, genres]); // selectedGenreName is not a dependency here as it's set inside

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
                filteredMovies
    ) : [];

    const isLoadingSeeAllContent = isSeeAllView ?
        (route.params?.type === 'latest' ? loadingLatest :
            route.params?.type === 'popular' ? loadingPopular :
                loadingFiltered) : false;

    return (
        <SafeAreaView style={styles.fullContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
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

                        {/* Genre/Category Filter */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterContainer} contentContainerStyle={styles.categoryFilterContent}>
                            {categories.map((categoryName) => (
                                <TouchableOpacity
                                    key={categoryName}
                                    style={[
                                        styles.categoryButton,
                                        selectedGenreName === categoryName && styles.selectedCategoryButton,
                                    ]}
                                    onPress={() => {
                                        setSelectedGenreName(categoryName);
                                        // The dedicated useEffect for category/sort will trigger fetchFilteredMovies
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.categoryButtonText,
                                            selectedGenreName === categoryName && styles.selectedCategoryButtonText,
                                        ]}
                                    >
                                        {categoryName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Toggle Filters Button */}
                        <TouchableOpacity style={styles.toggleFiltersButton} onPress={() => setShowFilters(!showFilters)}>
                            <MaterialCommunityIcons name={showFilters ? "filter-remove" : "filter-plus"} size={24} color="#4ADE80" />
                            <Text style={styles.toggleFiltersButtonText}>{showFilters ? 'Hide Filters' : 'Show More Filters'}</Text>
                        </TouchableOpacity>

                        {/* Collapsible Filter Section */}
                        {showFilters && (
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Advanced Filters</Text>

                                {/* Search by Name */}
                                <TextInput
                                    style={styles.filterInput}
                                    placeholder="Search by movie title..."
                                    placeholderTextColor="#A0A0A0"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    // Removed onEndEditing={fetchFilteredMovies} - now handled by combined useEffect
                                />

                                {/* Min Rating */}
                                <TextInput
                                    style={styles.filterInput}
                                    placeholder="Minimum rating (0-10)"
                                    placeholderTextColor="#A0A0A0"
                                    keyboardType="numeric"
                                    value={minRating}
                                    onChangeText={setMinRating}
                                    // Removed onEndEditing={fetchFilteredMovies} - now handled by combined useEffect
                                />

                                {/* Year Range */}
                                <View style={styles.yearRangeContainer}>
                                    <TextInput
                                        style={[styles.filterInput, styles.yearInput]}
                                        placeholder="Start Year"
                                        placeholderTextColor="#A0A0A0"
                                        keyboardType="numeric"
                                        maxLength={4}
                                        value={startYear}
                                        onChangeText={setStartYear}
                                        // Removed onEndEditing={fetchFilteredMovies} - now handled by combined useEffect
                                    />
                                    <Text style={styles.yearSeparator}>-</Text>
                                    <TextInput
                                        style={[styles.filterInput, styles.yearInput]}
                                        placeholder="End Year"
                                        placeholderTextColor="#A0A0A0"
                                        keyboardType="numeric"
                                        maxLength={4}
                                        value={endYear}
                                        onChangeText={setEndYear}
                                        // Removed onEndEditing={fetchFilteredMovies} - now handled by combined useEffect
                                    />
                                </View>

                                {/* Sort By */}
                                <View style={styles.sortContainer}>
                                    <Text style={styles.sortLabel}>Sort By:</Text>
                                    <TouchableOpacity
                                        style={[styles.sortButton, sortBy === 'release_date' && styles.selectedSortButton]}
                                        onPress={() => { setSortBy('release_date'); }} // This will trigger the dedicated useEffect
                                    >
                                        <Text style={[styles.sortButtonText, sortBy === 'release_date' && styles.selectedSortButtonText]}>Date</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sortButton, sortBy === 'vote_average' && styles.selectedSortButton]}
                                        onPress={() => { setSortBy('vote_average'); }} // This will trigger the dedicated useEffect
                                    >
                                        <Text style={[styles.sortButtonText, sortBy === 'vote_average' && styles.selectedSortButtonText]}>Rating</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Sort Order */}
                                <View style={styles.sortContainer}>
                                    <Text style={styles.sortLabel}>Order:</Text>
                                    <TouchableOpacity
                                        style={[styles.sortButton, sortOrder === 'desc' && styles.selectedSortButton]}
                                        onPress={() => { setSortOrder('desc'); }} // This will trigger the dedicated useEffect
                                    >
                                        <Text style={[styles.sortButtonText, sortOrder === 'desc' && styles.selectedSortButtonText]}>Descending</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sortButton, sortOrder === 'asc' && styles.selectedSortButton]}
                                        onPress={() => { setSortOrder('asc'); }} // This will trigger the dedicated useEffect
                                    >
                                        <Text style={[styles.sortButtonText, sortOrder === 'asc' && styles.selectedSortButtonText]}>Ascending</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Display Filtered Movies section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Filtered Movies</Text>
                        </View>
                        {loadingFiltered ? (
                            <ActivityIndicator size="large" color="#4ADE80" style={styles.loadingIndicator} />
                        ) : filteredMovies.length === 0 && !loadingFiltered && (
                            <View style={styles.emptyListContainer}>
                                <Text style={styles.emptyListText}>No movies match your filters.</Text>
                            </View>
                        )}
                        {!loadingFiltered && filteredMovies.length > 0 && (
                            <FlatList
                                data={filteredMovies}
                                renderItem={renderMovieCard}
                                keyExtractor={(item) => item._id}
                                numColumns={numColumns}
                                contentContainerStyle={styles.flatListContent}
                                scrollEnabled={false}
                            />
                        )}

                        {/* Latest Movies Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Latest Movies</Text>
                            <TouchableOpacity onPress={() => rootStackNavigation.navigate('MovieList', { type: 'latest' })}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        {loadingLatest ? (
                            <ActivityIndicator size="small" color="#4ADE80" style={styles.loadingIndicator} />
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
                            <ActivityIndicator size="small" color="#4ADE80" style={styles.loadingIndicator} />
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

                {isSeeAllView && (
                    <View style={styles.seeAllContainer}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.seeAllHeaderTitle}>
                                {route.params?.type === 'latest' ? 'Latest Movies' :
                                    route.params?.type === 'popular' ? 'Popular Movies' :
                                        route.params?.category || 'Filtered Movies'}
                            </Text>
                        </View>

                        {isLoadingSeeAllContent ? (
                            <ActivityIndicator size="large" color="#4ADE80" style={styles.loadingIndicator} />
                        ) : moviesToDisplayForSeeAll.length === 0 ? (
                            <View style={styles.emptyListContainer}>
                                <Text style={styles.emptyListText}>No movies available in this category.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={moviesToDisplayForSeeAll}
                                renderItem={renderMovieCard}
                                keyExtractor={(item) => item._id}
                                numColumns={numColumns}
                                contentContainerStyle={styles.flatListContent}
                                scrollEnabled={false} // Managed by outer ScrollView
                            />
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

// ... (your existing styles remain unchanged)
const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        paddingHorizontal: cardMargin, // Apply horizontal padding to the main container
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        // No horizontal padding here, handled by container
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
        backgroundColor: '#333', // Placeholder color
    },
    welcomeText: {
        color: '#A0A0A0',
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
    },
    userName: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
    },
    searchIconContainer: {
        padding: 8,
    },
    discoverTitle: {
        color: '#FFF',
        fontSize: 28,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 20,
        lineHeight: 36,
        // No horizontal padding
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 25,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 20,
        fontFamily: 'Montserrat_600SemiBold',
    },
    seeAllText: {
        color: '#4ADE80',
        fontSize: 16,
        fontFamily: 'Montserrat_500Medium',
    },
    loadingIndicator: {
        paddingVertical: 20,
    },
    horizontalMovieList: {
        paddingRight: cardMargin, // Ensure last item has correct margin
    },
    movieCardHorizontal: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12, // Aumentado ligeramente
        marginRight: 20,
        marginVertical: verticalCardMargin,
        width: 145, // Aumentado para que sea un poco más ancho
        height: 250, // Aumentado para que sea más grueso
        overflow: 'hidden',
        alignItems: 'center',
        paddingBottom: 10, // Espacio para el texto
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 8,
    },
     movieCardVertical: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12, // Aumentado ligeramente
        margin: cardMargin / 2, // Half margin for FlatList item spacing
        width: cardWidth,
        marginVertical: verticalCardMargin,
        height: 320, // Aumentado para que sea más grueso en la vista "See All"
        overflow: 'hidden',
        alignItems: 'center',
        paddingBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 8,
    },
    moviePoster: {
        width: '100%',
        height: '75%', // Ajustado para dejar espacio al texto, puedes jugar con este valor
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    movieTitleCard: {
        color: '#FFF',
        fontFamily: 'Montserrat_500Medium',
        fontSize: 14,
        marginTop: 8,
        paddingHorizontal: 8,
        textAlign: 'center',
    },
    movieInfoCard: {
        color: '#A0A0A0',
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        marginTop: 4,
        marginBottom: 8,
        paddingHorizontal: 8,
        textAlign: 'center',
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyHorizontalListContainer: {
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyListText: {
        color: '#A0A0A0',
        fontSize: 16,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
    },
    seeAllContainer: {
        flex: 1,
        // No padding here, handled by internal FlatList contentContainerStyle
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    seeAllHeaderTitle: {
        color: '#FFF',
        fontSize: 22,
        fontFamily: 'Montserrat_700Bold',
        flex: 1, // Allows title to take available space
    },
    flatListContent: {
        paddingHorizontal: cardMargin,
    },
    categoryFilterContainer: {
        marginBottom: 20,
    },
    categoryFilterContent: {
        paddingRight: 10, // Padding at the end of the horizontal scroll
    },
    categoryButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#333',
        marginRight: 10,
    },
    selectedCategoryButton: {
        backgroundColor: '#4ADE80',
    },
    categoryButtonText: {
        color: '#FFF',
        fontFamily: 'Montserrat_500Medium',
        fontSize: 14,
    },
    selectedCategoryButtonText: {
        color: '#FFF',
    },
    toggleFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginBottom: 20,
        borderRadius: 8,
        backgroundColor: '#1A1A1A',
        borderColor: '#333',
        borderWidth: 1,
    },
    toggleFiltersButtonText: {
        color: '#4ADE80',
        fontFamily: 'Montserrat_600SemiBold',
        marginLeft: 8,
        fontSize: 16,
    },
    filterSection: {
        backgroundColor: '#1A1A1A',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    filterSectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 15,
        textAlign: 'center',
    },
    filterInput: {
        backgroundColor: '#0A0A0A',
        color: '#FFF',
        fontFamily: 'Montserrat_400Regular',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
        fontSize: 16,
    },
    yearRangeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    yearInput: {
        flex: 1,
        marginHorizontal: 5,
    },
    yearSeparator: {
        color: '#FFF',
        fontSize: 20,
        fontFamily: 'Montserrat_500Medium',
        marginHorizontal: 5,
    },
    sortContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sortLabel: {
        color: '#FFF',
        fontFamily: 'Montserrat_500Medium',
        fontSize: 16,
        marginRight: 10,
    },
    sortButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#333',
        marginRight: 10,
    },
    selectedSortButton: {
        backgroundColor: '#4ADE80',
    },
    sortButtonText: {
        color: '#FFF',
        fontFamily: 'Montserrat_500Medium',
        fontSize: 14,
    },
    selectedSortButtonText: {
        color: '#FFF',
    },
});

export default MovieListScreen;