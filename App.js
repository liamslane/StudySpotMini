
import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from '@react-native-firebase/auth';

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from '@react-native-firebase/firestore';

// The native Firebase app is initialized automatically.
const auth = getAuth();
const db = getFirestore();

// Available study locations
const LOCATIONS = [
  'Thomas Cooper Library',
  'Russell House',
  'Main Campus Cafe',
];

export default function App() {
  // State variables
  const [selectedLocation, setSelectedLocation] = useState(
    LOCATIONS[0]
  );

  const [noiseLevel, setNoiseLevel] = useState(3);
  const [ratings, setRatings] = useState([]);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 1. Authenticate anonymously when the app starts.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);

          try {
            await signInAnonymously(auth);
          } catch (err) {
            setError('Authentication failed: ' + err.message);
            setLoading(false);
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Retrieve ratings from Firestore.
  useEffect(() => {
    if (!user) return;

    const ratingsCollection = collection(db, 'ratings');

    const unsubscribe = onSnapshot(
      ratingsCollection,
      (snapshot) => {
        const savedRatings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRatings(savedRatings);
        setError('');
        setLoading(false);
      },
      (err) => {
        setError('Failed to load ratings: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 3. Filter ratings for the selected location.
  const locationRatings = ratings.filter(
    (rating) => rating.location === selectedLocation
  );

  // 4. Calculate the average noise level.
  const total = locationRatings.reduce(
    (sum, rating) => sum + rating.noiseLevel,
    0
  );

  const average =
    locationRatings.length > 0
      ? (total / locationRatings.length).toFixed(1)
      : 'No ratings yet';

  // 5. Submit a new rating.
  async function submitRating() {
    if (!user || saving) return;

    setSaving(true);

    try {
      await addDoc(collection(db, 'ratings'), {
        location: selectedLocation,
        noiseLevel: noiseLevel,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Rating submitted successfully!');
    } catch (err) {
      Alert.alert('Error', 'Could not submit rating: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // 6. Render the user interface.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>StudySpot Mini</Text>

      <Text style={styles.subtitle}>
        Rate the noise level of your study spot.
      </Text>

      {loading && (
        <ActivityIndicator size="large" color="#2563eb" />
      )}

      {error !== '' && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <Text style={styles.heading}>Choose a location</Text>

      {LOCATIONS.map((location) => (
        <Pressable
          key={location}
          style={[
            styles.button,
            selectedLocation === location && styles.selected,
          ]}
          onPress={() => setSelectedLocation(location)}
        >
          <Text style={styles.buttonText}>{location}</Text>
        </Pressable>
      ))}

      <Text style={styles.heading}>Noise level</Text>

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Pressable
            key={level}
            style={[
              styles.ratingButton,
              noiseLevel === level && styles.selected,
            ]}
            onPress={() => setNoiseLevel(level)}
          >
            <Text style={styles.buttonText}>{level}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.description}>
        1 = Very quiet | 5 = Very loud
      </Text>

      <Pressable
        style={[
          styles.submitButton,
          (!user || saving || loading || error !== '') &&
            styles.disabledButton,
        ]}
        onPress={submitRating}
        disabled={!user || saving || loading || error !== ''}
      >
        <Text style={styles.submitText}>
          {saving ? 'Saving...' : 'Submit Rating'}
        </Text>
      </Pressable>

      <Text style={styles.heading}>Location Statistics</Text>

      <Text style={styles.statText}>
        Average noise level: {average}
      </Text>

      <Text style={styles.statText}>
        Total ratings: {locationRatings.length}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#ddd',
    padding: 14,
    marginBottom: 8,
    borderRadius: 8,
  },
  selected: {
    backgroundColor: '#8ab4f8',
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    backgroundColor: '#ddd',
    padding: 16,
    borderRadius: 8,
  },
  description: {
    marginTop: 10,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statText: {
    fontSize: 17,
    marginBottom: 10,
  },
  errorText: {
    color: '#b91c1c',
    marginVertical: 12,
  },
});
