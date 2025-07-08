// src/screens/SearchScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    Keyboard
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';

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

type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'SearchScreen'>;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http:/https://back-azq9.onrender.com/api';

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión.');
                setLoading(false);
                return;
            }

            // --- CORRECTION HERE ---
            // Change from /movies/search to /movies
            // Change from params: { query: ... } to params: { search: ... }
            const response = await axios.get<Movie[]>( // <--- ¡Esto es lo que debes cambiar!
            `${API_URL}/movies`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { search: query.trim() }, // Tu backend espera 'search'
            }
        );

        // *** Y aquí, porque response.data ahora ya es directamente Movie[] ***
        setSearchResults(response.data); // Cast directly to Movie[]
            // --- END CORRECTION ---

        } catch (err) {
            const axiosError = err as any;
            const errorMessage = axiosError.response?.data?.message || 'Error al buscar películas.';
            setError(errorMessage);
            Alert.alert('Error', errorMessage);
            console.error('Error searching movies:', axiosError.response?.data || axiosError.message);
            setSearchResults([]); // Clear results on error
        } finally {
            setLoading(false);
        }
    }, []);

    const debouncedSearch = useCallback(debounce(performSearch, 500), [performSearch]);

    useEffect(() => {
        debouncedSearch(searchQuery);
        return () => {
            debouncedSearch.cancel();
        };
    }, [searchQuery, debouncedSearch]);

    const renderMovieCard = ({ item }: { item: Movie }) => (
        <TouchableOpacity
            style={styles.movieCard}
            onPress={() => {
                Keyboard.dismiss();
                navigation.navigate('MovieDetail', { movieId: item._id, movieTitle: item.title });
            }}
        >
            <Image
                source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
                style={styles.moviePoster}
                resizeMode="cover"
            />
            <View style={styles.movieInfo}>
                <Text style={styles.movieTitleCard} numberOfLines={2}>{item.title}</Text>
                {item.release_date && (
                    <Text style={styles.movieReleaseDate}>{new Date(item.release_date).getFullYear()}</Text>
                )}
                <Text style={styles.movieOverview} numberOfLines={3}>{item.overview}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar películas..."
                    placeholderTextColor="#A0A0A0"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    returnKeyType="search"
                    onSubmitEditing={() => performSearch(searchQuery)}
                />
                <Ionicons name="search" size={24} color="#FFF" style={styles.searchIcon} />
            </View>

            {loading ? (
                <View style={styles.centeredMessage}>
                    <ActivityIndicator size="large" color="#E50914" />
                    <Text style={styles.messageText}>Buscando películas...</Text>
                </View>
            ) : error ? (
                <View style={styles.centeredMessage}>
                    <Text style={styles.messageTextError}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => performSearch(searchQuery)}>
                        <Text style={styles.retryButtonText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : searchResults.length === 0 && searchQuery.length > 0 ? (
                <View style={styles.centeredMessage}>
                    <Text style={styles.messageText}>No se encontraron resultados para "{searchQuery}".</Text>
                </View>
            ) : searchResults.length === 0 && searchQuery.length === 0 ? (
                <View style={styles.centeredMessage}>
                    <Text style={styles.messageText}>Empieza a escribir para buscar películas.</Text>
                </View>
            ) : (
                <FlatList
                    data={searchResults}
                    renderItem={renderMovieCard}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.resultsList}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: '#1C1C1C',
        borderBottomWidth: 1,
        borderBottomColor: '#262626',
    },
    backButton: {
        paddingRight: 10,
    },
    searchInput: {
        flex: 1,
        height: 45,
        backgroundColor: '#262626',
        borderRadius: 25,
        color: '#FFF',
        paddingHorizontal: 15,
        fontSize: 16,
        marginRight: 10,
        paddingLeft: 40,
    },
    searchIcon: {
        position: 'absolute',
        left: 55,
        top: 20,
    },
    resultsList: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    movieCard: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1C',
        borderRadius: 10,
        marginBottom: 15,
        overflow: 'hidden',
        alignItems: 'center',
        padding: 10,
    },
    moviePoster: {
        width: 80,
        height: 120,
        borderRadius: 8,
        marginRight: 15,
    },
    movieInfo: {
        flex: 1,
    },
    movieTitleCard: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    movieReleaseDate: {
        color: '#A0A0A0',
        fontSize: 14,
        marginBottom: 5,
    },
    movieOverview: {
        color: '#E0E0E0',
        fontSize: 14,
        lineHeight: 20,
    },
    centeredMessage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    messageText: {
        color: '#A0A0A0',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
    messageTextError: {
        color: '#FF6347',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
    retryButton: {
        backgroundColor: '#E50914',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 15,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});

export default SearchScreen;