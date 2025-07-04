// src/components/CommentSection.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // Added for re-fetching when screen comes into focus

export interface CommentUser {
    _id: string;
    username: string;
    avatar?: string;
    isCritic: boolean; // Ya existe, ¡perfecto!
}

export interface ICommentClient {
    _id: string;
    user: CommentUser | null; // MODIFICADO: Permite que 'user' sea null
    movie: string;
    text: string;
    rating: number; // Rating is 1-10
    createdAt: string;
    updatedAt: string;
    isSubsequentComment?: boolean;
}

interface CommentSectionProps {
    movieId: string;
    movieTitle: string; // Keep this for the internal heading if desired, though CommentsScreen now shows it
    currentUserAuthId: string | null;
    // NEW PROP: Function to call when an edit button is pressed
    onEditComment: (commentId: string, initialText: string, initialRating: number) => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const CommentSection: React.FC<CommentSectionProps> = ({
    movieId,
    movieTitle,
    currentUserAuthId,
    onEditComment, // Destructure the new prop
}) => {
    const [comments, setComments] = useState<ICommentClient[]>([]);
    // REMOVED: newCommentText, newCommentRating states as adding/editing logic moves out
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false); // Keep for delete logic
    // REMOVED: editingComment state as editing logic moves out
    const [activeTab, setActiveTab] = useState<'everyone' | 'you'>('everyone');

    // REMOVED: inputRef as direct input is no longer here

    const fetchComments = useCallback(async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get<{ data: { comments: ICommentClient[] } }>(
                `${API_URL}/comments/movie/${movieId}`,
                { headers }
            );
            let fetchedComments = response.data.data.comments;

            // <--- INICIO DE MODIFICACIÓN: Lógica de ordenamiento para críticos ---
            fetchedComments.sort((a, b) => {
                // MODIFICADO: Añadir verificación para 'a.user' y 'b.user'
                const aIsCritic = a.user?.isCritic || false;
                const bIsCritic = b.user?.isCritic || false;

                // Priorizar críticos: si 'a' es crítico y 'b' no, 'a' va primero.
                if (aIsCritic && !bIsCritic) {
                    return -1;
                }
                // Si 'b' es crítico y 'a' no, 'b' va primero.
                if (!aIsCritic && bIsCritic) {
                    return 1;
                }
                // Si ambos son críticos o ninguno lo es, ordenar por fecha (más reciente primero)
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            // <--- FIN DE MODIFICACIÓN: Lógica de ordenamiento ---

            setComments(fetchedComments);
        } catch (error) {
            console.error('Error fetching comments:', error);
            Alert.alert('Error', 'Failed to load comments.');
            setComments([]);
        } finally {
            setLoading(false);
        }
    }, [movieId]);

    // Use useFocusEffect to re-fetch comments whenever the screen gains focus
    useFocusEffect(
        useCallback(() => {
            fetchComments();
            // You can optionally return a cleanup function here if needed
            return () => {
                // Any cleanup logic when the screen loses focus
            };
        }, [fetchComments])
    );

    const filteredComments = comments.filter(comment => {
        if (activeTab === 'everyone') {
            return true;
        } else {
            // MODIFICADO: Añadir verificación para 'comment.user'
            return currentUserAuthId && comment.user && comment.user._id === currentUserAuthId;
        }
    });

    // REMOVED: handleRatingChange and handleSubmitComment as they are part of add/edit
    // The handleEdit function now calls the prop provided by CommentsScreen
    const handleEdit = (comment: ICommentClient) => {
        // MODIFICADO: Asegurarse de que comment.user no sea null antes de llamar onEditComment
        if (comment.user) {
            onEditComment(comment._id, comment.text, comment.rating);
        } else {
            Alert.alert('Error', 'Cannot edit a comment from an unknown user.');
        }
    };

    const handleDelete = async (commentId: string) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const token = await AsyncStorage.getItem('userToken');
                        if (!token) {
                            Alert.alert('Authentication Required', 'Please log in to delete a comment.');
                            return;
                        }
                        setSubmitting(true); // Indicate deletion is in progress
                        try {
                            await axios.delete(`${API_URL}/comments/${commentId}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            Alert.alert('Success', 'Comment deleted successfully.');
                            fetchComments(); // Re-fetch comments after deletion
                        } catch (error) {
                            const axiosError = error as any;
                            console.error('Error deleting comment:', axiosError.response?.data || axiosError.message);
                            Alert.alert('Error', axiosError.response?.data?.message || 'Failed to delete comment.');
                        } finally {
                            setSubmitting(false); // Reset submitting state
                        }
                    },
                },
            ]
        );
    };

    const renderStars = (rating: number) => {
        // AÑADE ESTE LOG para depurar si el rating llega correctamente a este componente
        // console.log('[DEBUG CommentSection] Rating recibido para renderizar:', rating);

        const stars = [];
        // La CLAVE: Usar Math.round(rating * 2) / 2 para manejar ratings enteros y con .5
        // Esto asegura que un rating de 1 se trate como 1.0, y 3 como 3.0.
        // Si en el futuro recibes 3.5, también lo manejará correctamente.
        // Ajusta la calificación a una escala de 1-5 si tu diseño de estrellas es de 5
        // Si tu rating es de 1-10, divídelo entre 2 para la visualización de 5 estrellas
        const displayRating = (Math.round(rating * 2) / 2); // (rating 1-10) -> (displayRating 0.5-5)

        for (let i = 1; i <= 5; i++) {
            let iconName: 'star' | 'star-half' | 'star-outline';
            let iconColor = '#FFD700'; // Color para estrellas llenas/medias

            if (displayRating >= i) {
                iconName = 'star';
            } else if (displayRating >= (i - 0.5)) {
                iconName = 'star-half';
            } else {
                iconName = 'star-outline';
                iconColor = '#A0A0A0'; // Color para estrellas vacías
            }
            stars.push(
                <Ionicons
                    key={i}
                    name={iconName}
                    size={16} // Mantén el tamaño para comentarios
                    color={iconColor}
                />
            );
        }
        return <View style={styles.starsContainer}>{stars}</View>;
    };
    const renderComment = ({ item }: { item: ICommentClient }) => {
        // MODIFICADO: Usar el operador opcional chaining `?.` y el operador nullish coalescing `??` o `||`
        // para manejar el caso donde item.user puede ser null.
        console.log(`[DEBUG CommentSection] Comment from ${item.user?.username || 'Unknown User'}, isCritic: ${item.user?.isCritic ?? false}, Rating: ${item.rating}`);

        const isMyComment = currentUserAuthId && item.user?._id === currentUserAuthId;
        const userAvatar = item.user?.avatar || 'https://via.placeholder.com/40/222222/FFFFFF?text=AV';
        const username = item.user?.username || 'Usuario Desconocido';
        const isCritic = item.user?.isCritic || false; // Asume false si item.user es null o isCritic no está definido

        return (
            <View style={[
                styles.commentCard,
                isCritic && styles.criticCommentCard // Aplica estilo dorado si es crítico
            ]}>
                {/* <--- FIN DE MODIFICACIÓN: Aplicar estilo de crítico condicionalmente --- */}
                <View style={styles.commentHeader}>
                    <Image source={{ uri: userAvatar }} style={styles.avatar} />
                    <View style={styles.commentUserInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Text style={styles.commentUsername}>{username}</Text>
                            {isCritic && (
                                <View style={styles.criticTag}>
                                    <Text style={styles.criticTagText}>CRÍTICO</Text>
                                </View>
                            )}
                        </View>
                        {renderStars(item.rating)}
                    </View>
                    {isMyComment && (
                        <View style={styles.commentActions}>
                            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                                <Ionicons name="pencil" size={18} color="#A0A0A0" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton} disabled={submitting}>
                                {submitting && comments.find(c => c._id === item._id) ? ( // Show loader only for the specific comment being deleted
                                    <ActivityIndicator size="small" color="#A0A0A0" />
                                ) : (
                                    <Ionicons name="trash" size={18} color="#A0A0A0" />
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <Text style={styles.commentText}>{item.text}</Text>
                <Text style={styles.commentDate}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.fullWidthContainer}
        // keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // No longer needed for input here
        >
            <View style={styles.commentSectionContainer}>
                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'everyone' && styles.activeTab]}
                        onPress={() => setActiveTab('everyone')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'everyone' && styles.activeTabButtonText]}>EVERYONE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'you' && styles.activeTab]}
                        onPress={() => {
                            if (!currentUserAuthId) {
                                Alert.alert('Login Required', 'Please log in to see your comments.');
                                return;
                            }
                            setActiveTab('you');
                        }}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'you' && styles.activeTabButtonText]}>YOU</Text>
                    </TouchableOpacity>
                </View>

                {/* REMOVED: Comment Input / Edit Section - this logic moves to AddCommentScreen */}
                {/* {currentUserAuthId ? (
                    <View style={styles.commentInputContainer}>
                        <TextInput
                            ref={inputRef}
                            style={styles.commentTextInput}
                            placeholder={editingComment ? 'Edit your comment...' : 'Write a comment...'}
                            placeholderTextColor="#888"
                            multiline
                            value={newCommentText}
                            onChangeText={setNewCommentText}
                            maxLength={500}
                        />
                        <View style={styles.ratingInputRow}>
                            <TextInput
                                style={styles.ratingInput}
                                placeholder="Rating (1-10)"
                                placeholderTextColor="#888"
                                keyboardType="numeric"
                                maxLength={2}
                                value={newCommentRating}
                                onChangeText={handleRatingChange}
                            />
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleSubmitComment}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        {editingComment ? 'Update' : 'Post'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        {editingComment && (
                            <TouchableOpacity
                                style={styles.cancelEditButton}
                                onPress={() => {
                                    setEditingComment(null);
                                    setNewCommentText('');
                                    setNewCommentRating('');
                                }}
                            >
                                <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <Text style={styles.loginPrompt}>Log in to leave a comment!</Text>
                )} */}


                {/* Comments List */}
                {loading ? (
                    <ActivityIndicator size="large" color="#E50914" style={styles.loadingComments} />
                ) : filteredComments.length === 0 ? (
                    <Text style={styles.noCommentsText}>
                        {activeTab === 'everyone' ? 'No comments yet. Be the first to review!' : 'You have not commented on this movie yet.'}
                    </Text>
                ) : (
                    <FlatList
                        data={filteredComments}
                        renderItem={renderComment}
                        keyExtractor={(item) => item._id}
                        scrollEnabled={false} // Always false, parent ScrollView will handle
                        contentContainerStyle={styles.commentsList}
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    fullWidthContainer: {
        width: '100%',
    },
    commentSectionContainer: {
        backgroundColor: '#0A0A0A',
        borderRadius: 0,
        padding: 20,
        marginHorizontal: 0,
    },
    // reviewTitle: { // This style is no longer used here but kept for reference
    //     fontSize: 22,
    //     fontWeight: 'bold',
    //     color: '#FFF',
    //     marginBottom: 20,
    //     textAlign: 'center',
    // },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#4ADE80',
    },
    tabButtonText: {
        color: '#A0A0A0',
        fontSize: 16,
        fontWeight: 'bold',
    },
    activeTabButtonText: {
        color: '#FFF',
    },
    // REMOVED commentInputContainer, commentTextInput, ratingInputRow,
    // ratingInput, submitButton, submitButtonText, cancelEditButton, cancelEditButtonText
    // as they are no longer part of this component.
    // commentInputContainer: {
    //     marginBottom: 20,
    //     borderWidth: 1,
    //     borderColor: '#333',
    //     borderRadius: 10,
    //     padding: 10,
    //     backgroundColor: '#1C1C1C',
    // },
    // commentTextInput: {
    //     color: '#FFF',
    //     fontSize: 16,
    //     minHeight: 80,
    //     textAlignVertical: 'top',
    //     marginBottom: 10,
    // },
    // ratingInputRow: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     marginBottom: 10,
    // },
    // ratingInput: {
    //     flex: 0.4,
    //     color: '#FFF',
    //     fontSize: 16,
    //     borderBottomWidth: 1,
    //     borderBottomColor: '#333',
    //     paddingBottom: 5,
    //     marginRight: 10,
    // },
    // submitButton: {
    //     flex: 0.6,
    //     backgroundColor: '#E50914',
    //     paddingVertical: 12,
    //     borderRadius: 10,
    //     alignItems: 'center',
    //     justifyContent: 'center',
    // },
    // submitButtonText: {
    //     color: '#FFF',
    //     fontSize: 16,
    //     fontWeight: 'bold',
    // },
    // cancelEditButton: {
    //     marginTop: 10,
    //     paddingVertical: 10,
    //     borderRadius: 10,
    //     alignItems: 'center',
    //     justifyContent: 'center',
    //     backgroundColor: '#555',
    // },
    // cancelEditButtonText: {
    //     color: '#FFF',
    //     fontSize: 14,
    // },
    loginPrompt: {
        color: '#A0A0A0',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    loadingComments: {
        marginTop: 20,
        marginBottom: 20,
    },
    noCommentsText: {
        color: '#A0A0A0',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    commentsList: {
        paddingBottom: 20,
    },
    commentCard: {
        backgroundColor: '#1C1C1C',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    // <--- INICIO DE ESTILOS AÑADIDOS ---
    criticCommentCard: {
        backgroundColor: '#3E2700', // Fondo dorado oscuro
        borderColor: '#FFD700', // Borde dorado
        borderWidth: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#333',
    },
    commentUserInfo: {
        flex: 1,
        justifyContent: 'center',
        flexDirection: 'row', // Permite alinear el username y el tag/estrellas
        alignItems: 'center',
        flexWrap: 'wrap', // Para que el tag y estrellas puedan saltar de línea si el username es muy largo
    },
    commentUsername: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8, // Espacio entre el nombre de usuario y el tag/estrellas
    },
    criticTag: {
        backgroundColor: '#FFD700', // Fondo dorado para el tag
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8, // Espacio entre el tag y las estrellas
        alignSelf: 'flex-start', // Alinea el tag al inicio si hay wrap
    },
    criticTagText: {
        color: '#0A0A0A', // Texto oscuro sobre dorado
        fontWeight: 'bold',
        fontSize: 10,
    },
    starsContainer: {
        flexDirection: 'row',
    },
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        marginLeft: 15,
        padding: 5,
    },
    commentText: {
        color: '#FFF',
        fontSize: 15,
        marginBottom: 10,
    },
    commentDate: {
        color: '#A0A0A0',
        fontSize: 12,
        textAlign: 'right',
    },
});

export default CommentSection;