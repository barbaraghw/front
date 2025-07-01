// src/components/CommentSection.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput, // Keep TextInput import if still used for rating input, but not for the main comment text
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView, // Keep if still needed for list, but less critical without direct input
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
}

export interface ICommentClient {
    _id: string;
    user: CommentUser;
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
                `${API_URL}/comments/${movieId}`,
                { headers }
            );
            setComments(response.data.data.comments);
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
            return currentUserAuthId && comment.user._id === currentUserAuthId;
        }
    });

    // REMOVED: handleRatingChange and handleSubmitComment as they are part of add/edit
    // The handleEdit function now calls the prop provided by CommentsScreen
    const handleEdit = (comment: ICommentClient) => {
        onEditComment(comment._id, comment.text, comment.rating);
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
        const fullStars = Math.floor(rating / 2);
        const hasHalfStar = rating % 2 !== 0;
        const stars = [];
        for (let i = 0; i < fullStars; i++) {
            stars.push(<Ionicons key={`full-${i}`} name="star" size={16} color="#4ADE80" />);
        }
        if (hasHalfStar) {
            stars.push(<Ionicons key="half" name="star-half" size={16} color="#4ADE80" />);
        }
        const emptyStars = 5 - stars.length;
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#A0A0A0" />);
        }
        return <View style={styles.starsContainer}>{stars}</View>;
    };

    const renderComment = ({ item }: { item: ICommentClient }) => {
        const isMyComment = currentUserAuthId && item.user._id === currentUserAuthId;
        const userAvatar = item.user.avatar || 'https://via.placeholder.com/40/222222/FFFFFF?text=AV';

        return (
            <View style={styles.commentCard}>
                <View style={styles.commentHeader}>
                    <Image source={{ uri: userAvatar }} style={styles.avatar} />
                    <View style={styles.commentUserInfo}>
                        <Text style={styles.commentUsername}>{item.user.username}</Text>
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
    },
    commentUsername: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
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