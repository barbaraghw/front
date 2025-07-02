import React, { useState, useEffect, useCallback } from 'react';
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
    SafeAreaView,
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

interface Comment {
    _id: string;
    userId: string;
    rating: number;
    text: string;
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

    const [userAverageRating, setUserAverageRating] = useState<number | null>(null);
    const [loadingUserRating, setLoadingUserRating] = useState(true);

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

    const fetchUserAverageRating = useCallback(async () => {
        setLoadingUserRating(true);
        try {
            console.log(`[DEBUG RATING] Intentando obtener comentarios para movieId: ${movieId}`);
            console.log(`[DEBUG RATING] URL de backend: ${API_URL}/comments/movie/${movieId}`);

            const response = await axios.get<{ success: boolean; data: { comments: Comment[] } }>(`${API_URL}/comments/movie/${movieId}`);
            const comments = response.data.data.comments;

            // *** AÑADIR ESTE LOG PARA VER DATOS CRUDOS ***
            console.log('[DEBUG RATING] RAW Comments from API:', JSON.stringify(comments, null, 2));
            console.log('[DEBUG RATING] Comments used for calculation:', comments.map(c => c.rating));

            console.log(`[DEBUG RATING] Respuesta de la API de comentarios (status): ${response.status}`);
            console.log(`[DEBUG RATING] Datos de comentarios obtenidos:`, comments);

            if (comments && comments.length > 0) {
                const validRatings = comments.filter(comment => typeof comment.rating === 'number' && !isNaN(comment.rating));

                console.log(`[DEBUG RATING] Ratings válidos encontrados:`, validRatings.map(c => c.rating));

                if (validRatings.length > 0) {
                    const totalRating = validRatings.reduce((sum, comment) => sum + comment.rating, 0);
                    const average = totalRating / validRatings.length;
                    console.log(`[DEBUG RATING] Rating promedio calculado: ${average.toFixed(1)}`);
                    setUserAverageRating(parseFloat(average.toFixed(1)));
                } else {
                    console.log("[DEBUG RATING] No se encontraron ratings numéricos válidos en los comentarios.");
                    setUserAverageRating(null);
                }
            } else {
                console.log("[DEBUG RATING] No se recibieron comentarios o el array de comentarios está vacío.");
                setUserAverageRating(null);
            }
        } catch (err: any) {
            console.error('Error al obtener comentarios de usuario para el rating:', err.response?.data || err.message);
            if (axios.isAxiosError(err) && err.response && err.response.status === 404) {
                   console.log("[DEBUG RATING] Endpoint de comentarios respondió 404, probablemente no hay comentarios aún.");
                   setUserAverageRating(null);
            } else {
                setError('Failed to load user ratings.');
                setUserAverageRating(null);
            }
        } finally {
            setLoadingUserRating(false);
            console.log(`[DEBUG RATING] Carga de rating de usuario finalizada para movieId: ${movieId}`);
        }
    }, [movieId]);

    useEffect(() => {
        fetchMovieDetails();
        fetchUserAverageRating();
    }, [fetchMovieDetails, fetchUserAverageRating]);

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

    // FUNCIÓN PARA RENDERIZAR LAS ESTRELLAS DEL RATING DE USUARIO
    // AHORA RECIBE userAverageRating COMO ARGUMENTO
    const renderUserRatingStars = (ratingToDisplay: number | null) => {
        console.log('[DEBUG DISPLAY] Rating recibido en renderUserRatingStars:', ratingToDisplay);
        if (ratingToDisplay === null || isNaN(ratingToDisplay)) {
            return <Text style={styles.noRatingText}>Sin ratings aún</Text>;
        }

        const stars = [];
        const roundedRating = Math.round(ratingToDisplay * 2) / 2;
        console.log('[DEBUG DISPLAY] Rounded rating para display:', roundedRating);

        for (let i = 1; i <= 5; i++) {
            let iconName: 'star' | 'star-half' | 'star-outline';
            let iconColor = '#FFD700';

            if (roundedRating >= i) {
                iconName = 'star';
            } else if (roundedRating >= (i - 0.5)) {
                iconName = 'star-half';
            } else {
                iconName = 'star-outline';
                iconColor = '#A0A0A0';
            }

            stars.push(
                <Ionicons
                    key={i}
                    name={iconName}
                    size={20}
                    color={iconColor}
                />
            );
        }
        return (
            <View style={styles.ratingSection}>
                <View style={styles.starsContainerMovieDetail}>{stars}</View>
                <Text style={styles.ratingText}>{ratingToDisplay.toFixed(1)} / 5</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Loading movie details...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchMovieDetails} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!movie) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <Text style={styles.errorText}>Movie not found.</Text>
            </SafeAreaView>
        );
    }

    const backdropUri = movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : null;
    const posterUri = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;

    return (
        <SafeAreaView style={styles.fullScreenContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
            <ScrollView style={styles.container}>
                {backdropUri ? (
                    <ImageBackground source={{ uri: backdropUri }} style={styles.backdrop}>
                        <View style={styles.overlay} />
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <Image source={{ uri: posterUri || 'https://via.placeholder.com/150' }} style={styles.poster} />
                            <View style={styles.movieInfo}>
                                <Text style={styles.movieTitle}>{movie.title}</Text>
                                {/* CADA LLAMADA A renderUserRatingStars DEBE PASAR userAverageRating */}
                                {loadingUserRating ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    renderUserRatingStars(userAverageRating)
                                )}
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
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonAbsolute}>
                            <Ionicons name="arrow-back" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Image source={{ uri: posterUri || 'https://via.placeholder.com/150' }} style={styles.noBackdropPoster} />
                        <View style={styles.noBackdropMovieInfo}>
                            <Text style={styles.movieTitle}>{movie.title}</Text>
                            {/* CADA LLAMADA A renderUserRatingStars DEBE PASAR userAverageRating */}
                            {loadingUserRating ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                renderUserRatingStars(userAverageRating)
                            )}
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
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 15 : 15,
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
    // Este estilo ya no se usa directamente para el rating principal, pero podría existir de antes
    // ratingContainer: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     marginBottom: 5,
    // },
    // ratingText: { // Este era para el rating TMDB, ahora lo usaremos para el promedio de usuario
    //     color: '#FFD700',
    //     fontSize: 18,
    //     fontWeight: 'bold',
    //     marginLeft: 5,
    // },
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
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 70,
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
        top: Platform.OS === 'ios' ? 15 : 15,
        left: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 5,
    },
    detailsContainer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 0 : 20,
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
        marginBottom: 30,
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
    // *** NUEVOS ESTILOS AÑADIDOS AQUI ***
    starsContainerMovieDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 5,
    },
    ratingText: { // Reutilizado, asegura que esté definido si no lo estaba
        color: '#FFD700', // Un color amarillo para el texto de la calificación
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 5, // Un poco de espacio desde las estrellas
    },
    ratingSection: { // Contenedor para alinear estrellas y texto
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    noRatingText: { // Para el mensaje "Sin ratings aún"
        color: '#A0A0A0',
        fontSize: 16,
        marginBottom: 5,
    },
});

export default MovieDetailScreen;