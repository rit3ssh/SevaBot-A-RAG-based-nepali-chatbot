import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_SERVER_IP, buildBaseURL } from '../services/api';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

// ─── Slide data ────────────────────────────────────────────────────────────
interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  desc: string;
  bg: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '⚖️',
    title: 'SevaBot मा स्वागत छ!',
    subtitle: 'डिजिटल नागरिक बडापत्र सहायक',
    desc: 'RAG प्रविधिमा आधारित चाटबट — नेपालीमा प्रश्न गर्नुहोस् र तुरुन्त उत्तर पाउनुहोस्।',
    bg: '#1e1b4b',
    accent: '#818cf8',
  },
  {
    id: '2',
    emoji: '🧠',
    title: 'RAG प्रणाली',
    subtitle: 'Retrieval-Augmented Generation',
    desc: 'SevaBot ले नेपाली कानुनी दस्तावेजहरूबाट सान्दर्भिक तथ्यहरू खोजेर सटीक उत्तर तयार गर्छ।',
    bg: '#0c1445',
    accent: '#60a5fa',
  },
  {
    id: '3',
    emoji: '💬',
    title: 'नेपालीमा सोध्नुहोस्',
    subtitle: 'सहज र प्राकृतिक भाषामा',
    desc: 'जटिल डिजिटल नागरिक बडापत्र प्रश्नहरू पनि आफ्नै भाषामा सोध्नुहोस् — SevaBot ले बुझेर जवाफ दिनेछ।',
    bg: '#0f172a',
    accent: '#34d399',
  },
  {
    id: '4',
    emoji: '🌐',
    title: 'Server कनेक्ट गर्नुहोस्',
    subtitle: 'आफ्नो backend IP राख्नुहोस्',
    desc: 'SevaBot backend server को IP address प्रविष्ट गर्नुहोस्। यसलाई बाद मा सेटिङमा परिवर्तन गर्न सकिन्छ।',
    bg: '#1a1a2e',
    accent: '#f59e0b',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────
export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [serverIP, setServerIP] = useState(DEFAULT_SERVER_IP);
  const [testing, setTesting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const goNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const testConnection = async () => {
    const ip = serverIP.trim();
    if (!ip) {
      Alert.alert('त्रुटि', 'Server IP खाली छ।');
      return;
    }
    setTesting(true);
    try {
      const baseURL = buildBaseURL(ip);
      await axios.get(`${baseURL.replace('/api', '')}/`, { timeout: 5000 });
      Alert.alert('✅ सफल!', `Server ${ip} मा सफलतापूर्वक जडान भयो।`);
    } catch (err: any) {
      // 404/401 still means server is reachable
      if (
        err.response?.status === 404 ||
        err.response?.status === 401 ||
        err.response?.status === 403 ||
        err.response?.status === 200
      ) {
        Alert.alert('✅ सफल!', `Server ${ip} मा जडान भयो।`);
      } else {
        Alert.alert(
          '❌ जडान असफल',
          `Server ${ip} मा पुग्न सकिएन।\n\nजाँच गर्नुहोस्:\n• Backend चलिरहेको छ?\n• IP ठिक छ?\n• Network connection?`,
        );
      }
    } finally {
      setTesting(false);
    }
  };

  const handleFinish = async () => {
    const ip = serverIP.trim() || DEFAULT_SERVER_IP;
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_IP, ip);
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');

    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      navigation.replace('Chat');
    } else {
      navigation.replace('Login');
    }
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={[styles.slide, { backgroundColor: item.bg }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={item.bg}
        translucent={false}
      />

      {/* Skip button */}
      {index < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
          <Text style={styles.skipText}>छोड्नुहोस्</Text>
        </TouchableOpacity>
      )}

      {/* Slide number */}
      <Text style={[styles.slideNumber, { color: item.accent }]}>
        {index + 1} / {SLIDES.length}
      </Text>

      {/* Image/Emoji hero */}
      <View style={[styles.emojiCircle, { borderColor: item.accent + '40' }]}>
        <View
          style={[styles.emojiInner, { backgroundColor: item.accent + '18' }]}
        >
          {index === 0 ? (
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.emoji}>{item.emoji}</Text>
          )}
        </View>
      </View>

      {/* Text content */}
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: '#ffffff' }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: item.accent }]}>
          {item.subtitle}
        </Text>
        <Text style={styles.desc}>{item.desc}</Text>
      </View>

      {/* Last slide — IP config */}
      {index === SLIDES.length - 1 && (
        <View style={styles.ipSection}>
          <View style={styles.ipCard}>
            <Text style={styles.ipLabel}>Server IP : Port</Text>
            <View style={styles.ipInputRow}>
              <TextInput
                style={styles.ipInput}
                value={serverIP}
                onChangeText={setServerIP}
                placeholder={DEFAULT_SERVER_IP}
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.testBtn, testing && { opacity: 0.6 }]}
                onPress={testConnection}
                disabled={testing}
              >
                <Text style={styles.testBtnText}>
                  {testing ? '⏳' : '🔗 Test'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.ipHint}>
              📱 Physical device: your computer's LAN IP (e.g. 192.168.1.x:8000)
              {'\n'}
              🤖 Android emulator: 10.0.2.2:8000 (default)
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: handleScroll },
        )}
        scrollEventThrottle={16}
        renderItem={renderSlide}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { backgroundColor: currentSlide.bg }]}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotColor = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: ['#4b5563', currentSlide.accent, '#4b5563'],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, backgroundColor: dotColor },
                ]}
              />
            );
          })}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: currentSlide.accent }]}
          onPress={goNext}
        >
          <Text style={styles.nextBtnText}>
            {isLastSlide ? '🚀 सुरु गर्नुहोस्' : 'अगाडि '}
          </Text>
          {!isLastSlide && (
            <Icon
              name="arrow-forward"
              size={18}
              color="#0f172a"
              style={{ marginLeft: 4 }}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 60,
    paddingBottom: 160, // space for bottom bar
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 56,
    right: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  slideNumber: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 28,
    opacity: 0.7,
  },
  emojiCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImg: {
    width: 100,
    height: 100,
  },
  emojiInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 72,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  desc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  // IP config section
  ipSection: {
    width: '100%',
    marginTop: 4,
  },
  ipCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  ipInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ipInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  testBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  ipHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
});
