// src/screens/MovieDetailScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions,
    TouchableOpacity,
    SafeAreaView, // Ya importado
    StatusBar,
    Linking,
    Image,
    Platform,
} from 'react-native';
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

const { height } = Dimensions.get('window');

interface MovieDetail {
    _id: string;
    title: string;
    overview: string;
    release_date: string;
    vote_average: number;
    poster_path: string;
    backdrop_path?: string;
    genres: { id: number; name: string }[];
    runtime?: number;
    trailer?: string;
}

interface DecodedToken {
    id: string;
    email: string;
    username: string;
    exp: number;
}

type MovieDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'MovieDetail'>;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const MovieDetailScreen: React.FC<MovieDetailScreenProps> = ({ route, navigation }) => {
    const { movieId, movieTitle } = route.params;
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        navigation.setOptions({ title: movieTitle });
    }, [movieTitle, navigation]);

    const fetchMovieDetails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.get<MovieDetail>(
                `${API_URL}/movies/${movieId}`,
                { headers }
            );

            console.log('API Response Status:', response.status);
            console.log('API Response Data:', JSON.stringify(response.data, null, 2));

            if (response.data) {
                setMovie(response.data);
            } else {
                console.warn('Unexpected API response: data is empty.');
                setError('No movie data received.');
                Alert.alert('Error', 'No movie data received.');
                setMovie(null);
            }
        } catch (err: any) {
            console.error('Error fetching movie details:', err.response?.data || err.message);
            setError('Failed to load movie details.');
            Alert.alert('Error', err.response?.data?.message || 'Failed to load movie details.');
        } finally {
            setLoading(false);
        }
    }, [movieId]);

    useEffect(() => {
        fetchMovieDetails();
    }, [fetchMovieDetails]);

    const handlePlayTrailer = () => {
        if (movie?.trailer) {
            Linking.openURL(movie.trailer).catch(err => Alert.alert("Error", "Could not play trailer."));
        } else {
            Alert.alert("No Trailer", "No trailer available for this movie.");
        }
    };

    const navigateToComments = () => {
        navigation.navigate('Comments', { movieId: movieId, movieTitle: movieTitle });
    };

    const navigateToAddComment = () => {
        if (movie) {
            const movieYear = new Date(movie.release_date).getFullYear().toString();
            navigation.navigate('AddComment', {
                movieId: movieId,
                movieTitle: movieTitle,
                movieYear: movieYear,
                posterPath: movie.poster_path,
            });
        } else {
            Alert.alert("Error", "No se pudo cargar la información de la película para comentar.");
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}> {/* Use SafeAreaView here too */}
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Loading movie details...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.errorContainer}> {/* Use SafeAreaView here too */}
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchMovieDetails} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!movie) {
        return (
            <SafeAreaView style={styles.errorContainer}> {/* Use SafeAreaView here too */}
                <Text style={styles.errorText}>Movie not found.</Text>
            </SafeAreaView>
        );
    }

    const backdropUri = movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : null;
    const posterUri = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;

    return (
        <SafeAreaView style={styles.fullScreenContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" /> {/* Set background color for status bar */}
            <ScrollView style={styles.container}>
                {backdropUri ? (
                    <ImageBackground source={{ uri: backdropUri }} style={styles.backdrop}>
                        <View style={styles.overlay} />
                        {/* Adjust backButton position to be relative to the top of the ImageBackground,
                            assuming ImageBackground will be pushed down by SafeAreaView's default padding.
                            A more robust solution for fixed headers/buttons on top of scrollable content
                            is often to put them OUTSIDE the ScrollView. But for now, let's adjust. */}
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <Image source={{ uri: posterUri || 'https://via.placeholder.com/150' }} style={styles.poster} />
                            <View style={styles.movieInfo}>
                                <Text style={styles.movieTitle}>{movie.title}</Text>
                                <View style={styles.ratingContainer}>
                                    <Ionicons name="star" size={20} color="#FFD700" />
                                    <Text style={styles.ratingText}>{movie.vote_average}/10</Text>
                                </View>
                                {movie.runtime && (
                                    <Text style={styles.runtimeText}>{`${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`}</Text>
                                )}
                                <View style={styles.genreContainer}>
                                    {movie.genres.map((genre, index) => (
                                        <Text key={genre.id} style={styles.genreText}>
                                            {genre.name}
                                            {index < movie.genres.length - 1 && '  '}
                                        </Text>
                                    ))}
                                </View>
                                {movie.trailer && (
                                    <TouchableOpacity style={styles.playButton} onPress={handlePlayTrailer}>
                                        <Ionicons name="play-circle" size={30} color="#FFF" />
                                        <Text style={styles.playButtonText}>Watch Trailer</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </ImageBackground>
                ) : (
                    <View style={styles.noBackdropContainer}>
                        {/* Similar adjustment for backButtonAbsolute */}
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonAbsolute}>
                            <Ionicons name="arrow-back" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Image source={{ uri: posterUri || 'https://via.placeholder.com/150' }} style={styles.noBackdropPoster} />
                        <View style={styles.noBackdropMovieInfo}>
                            <Text style={styles.movieTitle}>{movie.title}</Text>
                            <View style={styles.ratingContainer}>
                                <Ionicons name="star" size={20} color="#FFD700" />
                                <Text style={styles.ratingText}>{movie.vote_average}/10</Text>
                            </View>
                            {movie.runtime && (
                                <Text style={styles.runtimeText}>{`${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`}</Text>
                            )}
                            <View style={styles.genreContainer}>
                                {movie.genres.map((genre, index) => (
                                    <Text key={genre.id} style={styles.genreText}>
                                        {genre.name}
                                        {index < movie.genres.length - 1 && '  '}
                                    </Text>
                                ))}
                            </View>
                            {movie.trailer && (
                                <TouchableOpacity style={styles.playButton} onPress={handlePlayTrailer}>
                                    <Ionicons name="play-circle" size={30} color="#FFF" />
                                    <Text style={styles.playButtonText}>Watch Trailer</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                <View style={styles.detailsContainer}>
                    <Text style={styles.sectionHeading}>Overview</Text>
                    <Text style={styles.overviewText}>{movie.overview}</Text>

                    <Text style={styles.sectionHeading}>Release Date</Text>
                    <Text style={styles.infoText}>{new Date(movie.release_date).toLocaleDateString()}</Text>

                    <View style={styles.commentButtonsRow}>
                        <TouchableOpacity style={styles.commentActionButton} onPress={navigateToAddComment}>
                            <Text style={styles.commentActionButtonText}>Comentar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.commentActionButton, styles.viewCommentsButton]} onPress={navigateToComments}>
                            <Text style={styles.viewCommentsButtonText}>Ver comentarios</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
    },
    loadingText: {
        color: '#FFF',
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
    },
    errorText: {
        color: '#E50914',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#E50914',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backdrop: {
        width: '100%',
        height: Dimensions.get('window').height * 0.5,
        justifyContent: 'flex-end',
        position: 'relative',
        // Add paddingTop to the backdrop to ensure content starts below the safe area
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0, // Apply status bar height to android
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backButton: {
        position: 'absolute',
        // Using `top: 15` is typically enough if `SafeAreaView` provides initial padding,
        // otherwise `StatusBar.currentHeight + 10` on Android, or a fixed value for iOS
        top: Platform.OS === 'ios' ? 15 : 15, // Adjusted to be relative to the top of its parent (backdrop)
        left: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 5,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 20,
        zIndex: 1,
    },
    poster: {
        width: 120,
        height: 180,
        borderRadius: 10,
        marginRight: 20,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#333',
    },
    movieInfo: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    movieTitle: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    ratingText: {
        color: '#FFD700',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    runtimeText: {
        color: '#A0A0A0',
        fontSize: 16,
        marginBottom: 5,
    },
    genreContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    genreText: {
        color: '#A0A0A0',
        fontSize: 14,
        marginRight: 8,
        marginBottom: 4,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E50914',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 25,
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    playButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    noBackdropContainer: {
        // `paddingTop` here to explicitly push content below status bar/notch for no backdrop case
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 70, // Adding 20 for extra space if on Android without backdrop
        paddingHorizontal: 20,
        backgroundColor: '#1C1C1C',
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 20,
    },
    noBackdropPoster: {
        width: 120,
        height: 180,
        borderRadius: 10,
        marginRight: 20,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#333',
    },
    noBackdropMovieInfo: {
        flex: 1,
    },
    backButtonAbsolute: {
        position: 'absolute',
        // Similar adjustment as `backButton`
        top: Platform.OS === 'ios' ? 15 : 15, // Position relative to parent's top (noBackdropContainer)
        left: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 5,
    },
    detailsContainer: {
        padding: 20,
        // Add padding bottom to ensure last elements are not cut off by system navigation gestures/bars
        paddingBottom: Platform.OS === 'ios' ? 0 : 20, // iOS handles safe area, Android sometimes needs a little extra for bottom elements
    },
    sectionHeading: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 10,
    },
    overviewText: {
        color: '#A0A0A0',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 15,
    },
    infoText: {
        color: '#FFF',
        fontSize: 16,
        marginBottom: 5,
    },
    commentButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        marginBottom: 30, // Keep this as SafeAreaView handles bottom padding
    },
    commentActionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: '#4ADE80',
    },
    commentActionButtonText: {
        color: '#4ADE80',
        fontSize: 16,
        fontWeight: 'bold',
    },
    viewCommentsButton: {
        backgroundColor: '#4ADE80',
        borderColor: '#4ADE80',
    },
    viewCommentsButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MovieDetailScreen;