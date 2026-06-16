import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/src/store/authStore';
import { ref, get } from 'firebase/database';
import { rtdb } from '@/src/config/firebase';
import { Item } from '@/src/services/itemService';
import { requestService } from '@/src/services/requestService';
import { chatService } from '@/src/services/chatService';
import { aiService } from '@/src/services/aiService';

export default function ItemDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
  
  // Claim Form States
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; reason: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const isOwner = item?.userId === user?.uid;


  // Fetch Item details and Claim status from RTDB
  useEffect(() => {
    if (!id) return;

    const fetchItemDetails = async () => {
      try {
        console.log(`[ItemDetails] Fetching item ID: ${id}`);
        const itemRef = ref(rtdb, `items/${id}`);
        const snapshot = await get(itemRef);
        
        if (snapshot.exists()) {
          const itemData = { id, ...snapshot.val() } as Item;
          
          // Ensure verification questions always exist and default them if missing
          let questions = (itemData as any).verificationQuestions;
          if (questions && !Array.isArray(questions) && typeof questions === 'object') {
            console.log('[ItemDetails] Normalizing verificationQuestions dictionary to array');
            questions = Object.keys(questions)
              .sort((a, b) => Number(a) - Number(b))
              .map(key => (questions as any)[key]);
          }

          if (questions && Array.isArray(questions) && questions.length > 0) {
            (itemData as any).verificationQuestions = questions;
            setAnswers(new Array(questions.length).fill(''));
          } else {
            const defaultQ = [{ q: 'What is the brand or description of this item?', a: itemData.title }];
            (itemData as any).verificationQuestions = defaultQ;
            setAnswers(['']);
          }

          setItem(itemData);

          // Fetch claim status if not the owner
          if (itemData.userId !== user?.uid) {
            const status = await requestService.getClaimStatus(id);
            setClaimStatus(status);
          }
        } else {
          Alert.alert('Error', 'Item not found.');
          router.back();
        }
      } catch (err: any) {
        console.error('[ItemDetails] Error fetching details:', err);
        Alert.alert('Error', 'Failed to load item details.');
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [id, user]);

  const handleVerifySubmit = async () => {
    if (!item) return;
    setFormError('');
    setFeedback(null);

    const questions = (item as any).verificationQuestions;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      setFormError('No verification questions found for this item.');
      return;
    }

    if (answers.some(a => !a || a.trim().length === 0)) {
      setFormError('Please answer all questions.');
      return;
    }

    setVerifying(true);

    try {
      console.log('[ItemDetails] Requesting AI verification of answers...');
      const response = await aiService.verifyAnswers(questions, answers);
      console.log('[ItemDetails] AI verification result:', response);
      setFeedback(response);

      if (response.score >= 70) {
        setIsVerified(true);
      } else {
        setIsVerified(false);
        setFormError('Verification failed. The provided answers do not match the item details.');
        Alert.alert('Verification Failed', 'Verification failed. The provided answers do not match the item details.');
      }
    } catch (err: any) {
      console.error(err);
      setIsVerified(false);
      setFormError('Failed to verify answers: ' + (err.message || err));
    } finally {
      setVerifying(false);
    }
  };

  const handleClaimSubmit = async () => {
    if (!item) return;
    setVerifying(true);

    try {
      const questions = (item as any).verificationQuestions;
      const claimMessage = questions.map((q: any, i: number) => `Q: ${q.q}\nA: ${answers[i]}`).join('\n\n') + 
        `\n\nAI Verification Score: ${feedback?.score || 100}/100\nAI Verification Details: ${feedback?.reason || 'Conceptually matched'}`;

      const claimResult = await requestService.sendClaimRequest(item, claimMessage);
      
      if (claimResult.success) {
        setClaimStatus('pending');
        Alert.alert(
          'Request Sent!',
          "The finder will be notified. You'll be able to chat once they accept your request.",
          [
            {
              text: 'OK',
              onPress: () => {
                setShowClaimForm(false);
              }
            }
          ]
        );
      } else {
        setFormError('Failed to send claim request: ' + claimResult.error);
      }
    } catch (err: any) {
      console.error(err);
      setFormError('Failed to submit claim: ' + (err.message || err));
    } finally {
      setVerifying(false);
    }
  };

  const handleStartChat = async () => {
    if (!item) return;
    try {
      setLoading(true);
      const chatId = await chatService.getOrCreateChat(item.userId, item);
      setLoading(false);
      
      // Navigate to chat tab passing chatId as param
      router.push({
        pathname: '/(tabs)/chat',
        params: { chatId }
      } as any);
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      Alert.alert('Chat Error', 'Failed to start chat: ' + err.message);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#9A2E17" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Item not found.</Text>
      </View>
    );
  }

  if (showClaimForm && item) {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.claimFormContainer} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.claimHeader}>
            <Text style={styles.claimTitle}>Verify Ownership</Text>
            <Text style={styles.claimSubtitle}>
              Answer these questions to help the finder verify you are the owner.
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView contentContainerStyle={styles.claimScrollContent} showsVerticalScrollIndicator={false}>
            {/* Item Card */}
            <View style={styles.claimItemCard}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.claimItemImage} contentFit="cover" />
              ) : (
                <View style={[styles.claimItemImage, styles.claimItemImageFallback]}>
                  <Ionicons name="images-outline" size={24} color="#94A3B8" />
                </View>
              )}
              <View style={styles.claimItemDetails}>
                <Text style={styles.claimItemBadge}>FOUND ITEM</Text>
                <Text style={styles.claimItemTitle}>{item.title}</Text>
                <Text style={styles.claimItemLocation} numberOfLines={1}>
                  Found at {item.location || 'Not Specified'}
                </Text>
              </View>
            </View>

            {formError.length > 0 && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorAlertText}>{formError}</Text>
              </View>
            )}

            {/* Questions */}
            {((item as any).verificationQuestions || []).map((q: any, idx: number) => (
              <View key={idx} style={styles.questionCard}>
                <Text style={styles.questionText}>
                  {idx + 1}. {q.q}
                </Text>
                <TextInput
                  style={styles.claimTextInput}
                  placeholder="Your answer..."
                  placeholderTextColor="#94A3B8"
                  value={answers[idx] || ''}
                  onChangeText={(text) => {
                    const updated = [...answers];
                    updated[idx] = text;
                    setAnswers(updated);
                    setFormError('');
                    setIsVerified(false);
                  }}
                  editable={!verifying}
                />
              </View>
            ))}

            {/* Answers Matched Banner */}
            {isVerified && (
              <View style={styles.matchedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#047857" style={{ marginRight: 8 }} />
                <Text style={styles.matchedBannerText}>Answers matched!</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons at the Bottom */}
          <View style={styles.claimFooter}>
            {isVerified ? (
              <TouchableOpacity 
                style={styles.sendRequestBtn} 
                onPress={handleClaimSubmit}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendRequestBtnText}>Send Request</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.verifyBtn, 
                  (answers.some(a => !a || a.trim().length === 0) || verifying) && styles.verifyBtnDisabled
                ]} 
                onPress={handleVerifySubmit}
                disabled={answers.some(a => !a || a.trim().length === 0) || verifying}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyBtnText}>Submit & Verify</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.cancelLinkBtn} 
              onPress={() => {
                setShowClaimForm(false);
                setFormError('');
                setFeedback(null);
                setIsVerified(false);
              }}
              disabled={verifying}
            >
              <Text style={styles.cancelLinkLabel}>Cancel Claim</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Scrollable Content */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Image Banner & Header */}
          <View style={styles.imageContainer}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.heroImage} contentFit="cover" />
            ) : (
              <View style={styles.fallbackContainer}>
                <Ionicons name="images-outline" size={80} color="#94A3B8" />
                <Text style={styles.fallbackText}>No Photo Provided</Text>
              </View>
            )}
            
            {/* Back Button Overlay */}
            <TouchableOpacity 
              style={styles.backBtnOverlay} 
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>

            {/* Type Badge Overlay */}
            <View style={[styles.typeBadgeOverlay, item.type === 'lost' ? styles.badgeLost : styles.badgeFound]}>
              <Text style={styles.typeBadgeText}>
                {item.type === 'lost' ? 'LOST' : 'FOUND'}
              </Text>
            </View>
          </View>

          {/* Details Body */}
          <View style={styles.body}>
            
            {/* Title & Category Line */}
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.categorySubText}>Category: {item.category}</Text>
              </View>
              {item.type === 'found' && (
                <View style={styles.aiBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={styles.aiBadgeText}>AI-verified</Text>
                </View>
              )}
            </View>

            {/* Metadata Card Info */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <View style={styles.metaIconWrapper}>
                  <Ionicons name="location-outline" size={20} color="#9A2E17" />
                </View>
                <View style={styles.metaTextWrapper}>
                  <Text style={styles.metaLabel}>LOCATION</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>{item.location || 'Not Specified'}</Text>
                </View>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaRow}>
                <View style={styles.metaIconWrapper}>
                  <Ionicons name="calendar-outline" size={20} color="#9A2E17" />
                </View>
                <View style={styles.metaTextWrapper}>
                  <Text style={styles.metaLabel}>REPORTED ON</Text>
                  <Text style={styles.metaValue}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaRow}>
                <View style={styles.metaIconWrapper}>
                  <Ionicons name="person-outline" size={20} color="#9A2E17" />
                </View>
                <View style={styles.metaTextWrapper}>
                  <Text style={styles.metaLabel}>REPORTED BY</Text>
                  <Text style={styles.metaValue}>{isOwner ? 'You' : item.user || 'Anonymous'}</Text>
                </View>
              </View>

              {/* Show Phone Number if Owner, Claim Accepted or Lost item type */}
              {(!isOwner && (claimStatus === 'accepted' || item.type === 'lost') && item.phoneNumber) && (
                <>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaRow}>
                    <View style={styles.metaIconWrapper}>
                      <Ionicons name="call-outline" size={20} color="#9A2E17" />
                    </View>
                    <View style={styles.metaTextWrapper}>
                      <Text style={styles.metaLabel}>PHONE NUMBER</Text>
                      <Text style={styles.metaValue}>+91 {item.phoneNumber}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>DESCRIPTION</Text>
              <Text style={styles.descriptionText}>{item.description || 'No description provided.'}</Text>
            </View>

            {/* Claim Actions Layout */}
            <View style={styles.actionsContainer}>
              {isOwner ? (
                <View style={styles.ownerBadge}>
                  <Ionicons name="create-outline" size={18} color="#9A2E17" />
                  <Text style={styles.ownerBadgeText}>Your Reported Item</Text>
                </View>
              ) : (
                <>
                  {item.type === 'found' && (
                    <View style={{ width: '100%' }}>
                      {claimStatus === null && (
                        <TouchableOpacity 
                          style={styles.primaryBtn} 
                          onPress={() => setShowClaimForm(true)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.primaryBtnText}>Claim This Item</Text>
                        </TouchableOpacity>
                      )}
                      {claimStatus === 'pending' && (
                        <View style={[styles.statusCard, styles.statusPending]}>
                          <ActivityIndicator size="small" color="#B45309" style={{ marginRight: 8 }} />
                          <Text style={styles.statusTextPending}>
                            Verification Pending: Finder is reviewing.
                          </Text>
                        </View>
                      )}
                      {claimStatus === 'accepted' && (
                        <View style={{ gap: 12 }}>
                          <div style={styles.webStyleHack} />
                          <View style={[styles.statusCard, styles.statusSuccess]}>
                            <Ionicons name="checkmark-circle" size={20} color="#047857" style={{ marginRight: 8 }} />
                            <Text style={styles.statusTextSuccess}>
                              Claim Approved! Phone unlocked.
                            </Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.primaryBtn} 
                            onPress={handleStartChat}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="chatbubbles-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryBtnText}>Start Chat with Finder</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {claimStatus === 'rejected' && (
                        <View style={[styles.statusCard, styles.statusError]}>
                          <Ionicons name="close-circle" size={20} color="#B91C1C" style={{ marginRight: 8 }} />
                          <Text style={styles.statusTextError}>
                            Claim Rejected. Contact support if inaccurate.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {item.type === 'lost' && (
                    <TouchableOpacity 
                      style={styles.primaryBtn} 
                      onPress={handleStartChat}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubbles-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryBtnText}>Contact Owner</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6F6',
  },
  errorText: {
    fontSize: 16,
    color: '#636E72',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    height: 300,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#94A3B8',
    marginTop: 10,
    fontWeight: 'bold',
  },
  backBtnOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  typeBadgeOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeLost: {
    backgroundColor: '#F27A35',
  },
  badgeFound: {
    backgroundColor: '#9A2E17',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  categorySubText: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '600',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FBF3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  aiBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metaTextWrapper: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3436',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1.0,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    color: '#2D3436',
    lineHeight: 22,
  },
  actionsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    width: '100%',
    justifyContent: 'center',
  },
  ownerBadgeText: {
    color: '#9A2E17',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#9A2E17',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    shadowColor: '#9A2E17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  statusError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  statusTextPending: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusTextSuccess: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusTextError: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeaderCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6F6',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  formHeaderTitle: {
    color: '#9A2E17',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorAlertText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A1A1A',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  feedbackCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  feedbackSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  feedbackError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  feedbackScoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  feedbackReasonText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9A2E17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#9A2E17',
    fontWeight: 'bold',
    fontSize: 15,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#9A2E17',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  webStyleHack: {
    display: 'none',
  },
  claimFormContainer: {
    flex: 1,
    backgroundColor: '#EFF6F6',
  },
  claimHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  claimTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  claimSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  claimScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  claimItemCard: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  claimItemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  claimItemImageFallback: {
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  claimItemBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EA580C',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  claimItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  claimItemLocation: {
    fontSize: 12,
    color: '#64748B',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  claimTextInput: {
    backgroundColor: '#EFF6F6',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
  },
  matchedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  matchedBannerText: {
    color: '#047857',
    fontWeight: 'bold',
    fontSize: 14,
  },
  claimFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#EFF6F6',
  },
  verifyBtn: {
    height: 52,
    backgroundColor: '#F27A35',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F27A35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyBtnDisabled: {
    backgroundColor: '#FDBA74',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendRequestBtn: {
    height: 52,
    backgroundColor: '#9A2E17',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9A2E17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sendRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelLinkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelLinkLabel: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  }
});
