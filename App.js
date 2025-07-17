import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ImageBackground,
  Image,
  ActivityIndicator,
  Alert, // Using Alert for simple confirmations as per instructions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker'; // New import for image picker
import Constants from 'expo-constants'; // Add this line
import { Picker } from '@react-native-picker/picker'; // Ensure this is correctly imported

// Firebase Imports (MUST BE USED)
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'; // New import for persistence
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = {
  apiKey: Constants.expoConfig.extra.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig.extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig.extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig.extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig.extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig.extra.EXPO_PUBLIC_FIREBASE_APP_ID,
  // measurementId: Constants.expoConfig.extra.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, // Uncomment if you use it
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  // Initialize Auth with persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Handle error gracefully, e.g., show a message to the user
}

// --- Helper Functions ---

// Get initials for avatar placeholder
const getInitials = (name) => {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// --- Firestore Service Functions ---
const getContactsCollectionRef = (userId) => {
  return collection(db, `artifacts/${appId}/users/${userId}/contacts`);
};

/**
 * Fetches contacts in real-time using onSnapshot.
 * @param {string} userId - The current user's ID.
 * @param {function} callback - Callback function to receive contacts.
 * @returns {function} - Unsubscribe function for the listener.
 */
const subscribeToContacts = (userId, callback) => {
  if (!db || !userId) {
    console.error("Firestore DB or userId not available for subscription.");
    return () => {}; // Return a no-op unsubscribe
  }
  const q = query(getContactsCollectionRef(userId));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const contacts = [];
    snapshot.forEach((doc) => {
      contacts.push({ id: doc.id, ...doc.data() });
    });
    callback(contacts);
  }, (error) => {
    console.error("Error subscribing to contacts:", error);
  });
  return unsubscribe;
};

/**
 * Adds a new contact to Firestore.
 * @param {string} userId - The current user's ID.
 * @param {object} contactData - The contact data to add.
 * @returns {Promise<string>} - The ID of the new document.
 */
const addContact = async (userId, contactData) => {
  if (!db || !userId) {
    console.error("Firestore DB or userId not available for adding contact.");
    throw new Error("Firestore not initialized or user not authenticated.");
  }
  try {
    const docRef = await addDoc(getContactsCollectionRef(userId), contactData);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

/**
 * Updates an existing contact in Firestore.
 * @param {string} userId - The current user's ID.
 * @param {string} contactId - The ID of the contact to update.
 * @param {object} contactData - The updated contact data.
 */
const updateContact = async (userId, contactId, contactData) => {
  if (!db || !userId) {
    console.error("Firestore DB or userId not available for updating contact.");
    throw new Error("Firestore not initialized or user not authenticated.");
  }
  try {
    await setDoc(doc(db, `artifacts/${appId}/users/${userId}/contacts`, contactId), contactData, { merge: true });
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

/**
 * Deletes a contact from Firestore.
 * @param {string} userId - The current user's ID.
 * @param {string} contactId - The ID of the contact to delete.
 */
const deleteContact = async (userId, contactId) => {
  if (!db || !userId) {
    console.error("Firestore DB or userId not available for deleting contact.");
    throw new Error("Firestore not initialized or user not authenticated.");
  }
  try {
    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/contacts`, contactId));
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};

// --- CallScreen Component ---
const CallScreen = ({ callingContact, onAnswer, onDecline }) => {
  if (!callingContact) {
    return null; // Don't render if no contact is calling
  }

  // Determine the primary text to display based on user preference stored in contact
  const getPrimaryText = (contact) => {
    let primaryText = contact.name; // Name is always common

    switch (contact.primaryDisplayField) {
      case 'location':
        if (contact.location) {
          primaryText = `${contact.name} (${contact.location})`;
        }
        break;
      case 'profession':
        if (contact.profession) {
          primaryText = `${contact.name} (${contact.profession})`;
        }
        break;
      case 'referenceContact':
        if (contact.referenceContact) {
          primaryText = `${contact.name} (${contact.referenceContact})`;
        }
        break;
      case 'name':
      default:
        // primaryText is already contact.name
        break;
    }
    return primaryText;
  };

  // Determine the secondary details to display
  const getSecondaryDetails = (contact) => {
    const allDetails = [];

    // Add all potential secondary details
    if (contact.location && contact.primaryDisplayField !== 'location') {
      allDetails.push(contact.location);
    }
    if (contact.profession && contact.primaryDisplayField !== 'profession') {
      allDetails.push(contact.profession);
    }
    if (contact.referenceContact && contact.primaryDisplayField !== 'referenceContact') {
      allDetails.push(contact.referenceContact);
    }
    if (contact.phoneNumber) {
      allDetails.push(contact.phoneNumber);
    }
    if (contact.email) {
      allDetails.push(contact.email);
    }

    // Use a Set to remove any potential duplicates, though less likely now
    const uniqueDetails = [...new Set(allDetails)];

    return uniqueDetails.join(' • '); // Use a dot separator for a clean look
  };

  const primaryText = getPrimaryText(callingContact);
  const secondaryDetails = getSecondaryDetails(callingContact);

  return (
    <View style={styles.callScreenContainer}>
      {callingContact.photoUri ? (
        <ImageBackground source={{ uri: callingContact.photoUri }} style={styles.callBackgroundImage}>
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
            style={styles.gradientOverlay}
          />
          <View style={styles.callInfoOverlay}>
            <Text style={styles.callingNamePrimary}>{primaryText}</Text>
            {secondaryDetails ? (
              <Text style={styles.callingNameSecondary}>{secondaryDetails}</Text>
            ) : null}
          </View>
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.callBackgroundImage}
        >
          <View style={styles.initialsContainer}>
            <Text style={styles.initialsText}>{getInitials(callingContact.name)}</Text>
          </View>
          <View style={styles.callInfoOverlay}>
            <Text style={styles.callingNamePrimary}>{primaryText}</Text>
            {secondaryDetails ? (
              <Text style={styles.callingNameSecondary}>{secondaryDetails}</Text>
            ) : null}
          </View>
        </LinearGradient>
      )}

      {/* Call Actions */}
      <View style={styles.callActions}>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
          <Text style={styles.buttonIcon}>📞</Text>
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.answerButton} onPress={onAnswer}>
          <Text style={styles.buttonIcon}>📞</Text>
          <Text style={styles.buttonText}>Answer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- ContactFormScreen (Filling Page) ---
const ContactFormScreen = ({ navigation, currentContact, onSaveContact, onDeleteContact }) => {
  const [name, setName] = useState(currentContact?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentContact?.phoneNumber || '');
  const [email, setEmail] = useState(currentContact?.email || '');
  const [location, setLocation] = useState(currentContact?.location || '');
  const [profession, setProfession] = useState(currentContact?.profession || '');
  const [referenceContact, setReferenceContact] = useState(currentContact?.referenceContact || '');
  const [photoUri, setPhotoUri] = useState(currentContact?.photoUri || '');
  const [primaryDisplayField, setPrimaryDisplayField] = useState(currentContact?.primaryDisplayField || 'name');

  const isEditMode = !!currentContact;

  // Function to pick an image from the device's library
  const pickImage = async () => {
    // Request permission to access the media library
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square crop
      quality: 0.5, // Reduce quality for faster loading/saving
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };


  const handleSave = () => {
    if (name.trim() === '' || phoneNumber.trim() === '') {
      Alert.alert('Validation Error', 'Name and Phone Number are required.');
      return;
    }
    const contactData = {
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      location: location.trim(),
      profession: profession.trim(),
      referenceContact: referenceContact.trim(),
      photoUri: photoUri.trim(),
      primaryDisplayField: primaryDisplayField,
    };
    onSaveContact(contactData, currentContact?.id);
    navigation.goBack(); // Go back to contacts list
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Contact",
      "Are you sure you want to delete this contact?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel"
        },
        { text: "Delete", onPress: () => {
            if (isEditMode) {
              onDeleteContact(currentContact.id);
              navigation.goBack();
            }
          },
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };

  // Helper for placeholder image
  const getPhotoPlaceholder = () => {
    if (photoUri) {
      return <Image source={{ uri: photoUri }} style={styles.formPhoto} />;
    }
    return (
      <View style={styles.formPhotoPlaceholder}>
        <Text style={styles.formPhotoPlaceholderText}>{getInitials(name || 'Contact')}</Text>
      </View>
    );
  };

  // Radio button options
  const displayOptions = [
    { label: "Name Only", value: "name" },
    { label: "Name + Location", value: "location" },
    { label: "Name + Profession", value: "profession" },
    { label: "Name + Reference", value: "referenceContact" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.formScrollViewContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingContainer}
        >
          <View style={styles.formHeaderContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>{'< Back'}</Text>
            </TouchableOpacity>
            <Text style={styles.formHeader}>{isEditMode ? 'Edit Contact' : 'Add New Contact'}</Text>
            {isEditMode && (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Contact Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage} style={styles.photoPickerButton}>
              {getPhotoPlaceholder()}
              <Text style={styles.photoPickerButtonText}>
                {photoUri ? 'Change Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Details */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Main Details</Text>
            <TextInput style={styles.input} placeholder="Name *" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Phone Number *" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          {/* Additional Fields */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Additional Information</Text>
            <TextInput style={styles.input} placeholder="Location (City, Area)" value={location} onChangeText={setLocation} />
            <TextInput style={styles.input} placeholder="Profession/Title" value={profession} onChangeText={setProfession} />
            <TextInput style={styles.input} placeholder="Reference/Relationship (e.g., Ana’s brother)" value={referenceContact} onChangeText={setReferenceContact} />
          </View>

          {/* Personalize Display - Radio Buttons */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>How should this contact appear on calls?</Text>
            <View style={styles.radioGroup}>
              {displayOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioButton}
                  onPress={() => setPrimaryDisplayField(option.value)}
                >
                  <View style={[styles.radioCircle, primaryDisplayField === option.value && styles.selectedRadioCircle]}>
                    {primaryDisplayField === option.value && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={!name || !phoneNumber}>
            <Text style={styles.saveButtonText}>{isEditMode ? 'Update Contact' : 'Save Contact'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- ContactsListScreen (Exploring Page) ---
const ContactsListScreen = ({ navigation, contacts, onSimulateCall, onRefreshContacts, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Favorites', 'Work', 'Family'

  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(lowerCaseQuery) ||
      contact.profession.toLowerCase().includes(lowerCaseQuery) ||
      contact.referenceContact.toLowerCase().includes(lowerCaseQuery) ||
      contact.location.toLowerCase().includes(lowerCaseQuery) ||
      contact.phoneNumber.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const renderContactCard = ({ item }) => {
    // Determine the main display name based on the contact's saved preference
    const getMainDisplayName = (contact) => {
      let displayName = contact.name;
      switch (contact.primaryDisplayField) {
        case 'location':
          if (contact.location) displayName = `${contact.name} (${contact.location})`;
          break;
        case 'profession':
          if (contact.profession) displayName = `${contact.name} (${contact.profession})`;
          break;
        case 'referenceContact':
          if (contact.referenceContact) displayName = `${contact.name} (${contact.referenceContact})`;
          break;
        case 'name':
        default:
          // displayName is already contact.name
          break;
      }
      return displayName;
    };

    // Determine secondary details for the list card
    const getSecondaryDetails = (contact) => {
      const details = [];
      if (contact.primaryDisplayField !== 'profession' && contact.profession) {
        details.push(contact.profession);
      }
      if (contact.primaryDisplayField !== 'location' && contact.location) {
        details.push(contact.location);
      }
      if (contact.primaryDisplayField !== 'referenceContact' && contact.referenceContact) {
        details.push(contact.referenceContact);
      }
      return details.join(' • ');
    };

    return (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => navigation.navigate('ContactForm', { contact: item })}
      >
        <View style={styles.contactCardLeft}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.contactCardPhoto} />
          ) : (
            <View style={styles.contactCardPhotoPlaceholder}>
              <Text style={styles.contactCardPhotoText}>{getInitials(item.name)}</Text>
            </View>
          )}
          <View style={styles.contactCardDetails}>
            <Text style={styles.contactCardMainName}>{getMainDisplayName(item)}</Text>
            {getSecondaryDetails(item) ? (
              <Text style={styles.contactCardSecondaryDetails}>{getSecondaryDetails(item)}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.contactCardActions}>
          <TouchableOpacity style={styles.contactCardCallButton} onPress={() => onSimulateCall(item)}>
            <Text style={styles.contactCardCallButtonText}>📞</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.contactCardMessageButton}>
            <Text style={styles.contactCardMessageButtonText}>✉️</Text>
          </TouchableOpacity> */}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'All' && styles.filterTabActive]}
          onPress={() => setActiveFilter('All')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'All' && styles.filterTabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'Favorites' && styles.filterTabActive]}
          onPress={() => setActiveFilter('Favorites')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'Favorites' && styles.filterTabTextActive]}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'Work' && styles.filterTabActive]}
          onPress={() => setActiveFilter('Work')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'Work' && styles.filterTabTextActive]}>Work</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'Family' && styles.filterTabActive]}
          onPress={() => setActiveFilter('Family')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'Family' && styles.filterTabTextActive]}>Family</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : filteredContacts.length === 0 && contacts.length > 0 ? (
        <Text style={styles.noResultsText}>No contacts match your search.</Text>
      ) : filteredContacts.length === 0 && contacts.length === 0 ? (
        <Text style={styles.noContactsYetText}>No contacts added yet. Tap '+' to add one!</Text>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContactCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contactListContent}
        />
      )}

      {/* Floating Add Contact Button */}
      <TouchableOpacity
        style={styles.addContactFloatingButton}
        onPress={() => navigation.navigate('ContactForm', { contact: null })}
      >
        <Text style={styles.addContactFloatingButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// --- Main App Component ---
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('ContactsList'); // 'ContactsList', 'ContactForm', 'CallScreen'
  const [selectedContactForForm, setSelectedContactForForm] = useState(null); // For editing
  const [callingContact, setCallingContact] = useState(null); // For call screen
  const [contacts, setContacts] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Firebase Authentication and Firestore Listener
  useEffect(() => {
    const initFirebaseAndAuth = async () => {
      try {
        // Sign in with custom token if available, otherwise anonymously
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth error:", error);
        // Fallback to anonymous if custom token fails or is not provided
        try {
          await signInAnonymously(auth);
        } catch (anonError) {
          console.error("Anonymous sign-in failed:", anonError);
        }
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setIsAuthReady(true);
        console.log("User authenticated:", user.uid);
      } else {
        setUserId(crypto.randomUUID()); // Use a random ID if not authenticated (for local testing without full auth)
        setIsAuthReady(true);
        console.log("No user authenticated, using random ID.");
      }
    });

    initFirebaseAndAuth();

    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []); // Run once on component mount

  // Firestore contact subscription
  useEffect(() => {
    let unsubscribeContacts;
    if (isAuthReady && userId) {
      setIsLoadingContacts(true);
      unsubscribeContacts = subscribeToContacts(userId, (fetchedContacts) => {
        setContacts(fetchedContacts);
        setIsLoadingContacts(false);
      });
    }

    return () => {
      if (unsubscribeContacts) {
        unsubscribeContacts(); // Cleanup Firestore listener
      }
    };
  }, [isAuthReady, userId]); // Re-run when auth state or userId changes

  const handleSaveContact = async (contactData, contactId = null) => {
    try {
      if (contactId) {
        await updateContact(userId, contactId, contactData);
        Alert.alert("Success", "Contact updated successfully!");
      } else {
        await addContact(userId, contactData);
        Alert.alert("Success", "Contact added successfully!");
      }
    } catch (error) {
      console.error("Error saving contact:", error);
      Alert.alert("Error", "Failed to save contact. Please try again.");
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await deleteContact(userId, contactId);
      Alert.alert("Success", "Contact deleted successfully!");
    } catch (error) {
      console.error("Error deleting contact:", error);
      Alert.alert("Error", "Failed to delete contact. Please try again.");
    }
  };

  const handleSimulateCall = (contact) => {
    setCallingContact(contact);
    setCurrentScreen('CallScreen');
  };

  const handleAnswerCall = () => {
    Alert.alert(`Call from ${callingContact.name} answered!`);
    setCallingContact(null);
    setCurrentScreen('ContactsList');
  };

  const handleDeclineCall = () => {
    Alert.alert(`Call from ${callingContact.name} declined!`);
    setCallingContact(null);
    setCurrentScreen('ContactsList');
  };

  // Simple navigation function
  const navigate = (screenName, params = {}) => {
    setCurrentScreen(screenName);
    if (screenName === 'ContactForm') {
      setSelectedContactForForm(params.contact);
    }
  };

  // Render the appropriate screen based on `currentScreen` state
  if (!isAuthReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Initializing app...</Text>
      </View>
    );
  }

  switch (currentScreen) {
    case 'ContactsList':
      return (
        <ContactsListScreen
          navigation={{ navigate }}
          contacts={contacts}
          onSimulateCall={handleSimulateCall}
          isLoading={isLoadingContacts}
        />
      );
    case 'ContactForm':
      return (
        <ContactFormScreen
          navigation={{ goBack: () => navigate('ContactsList') }}
          currentContact={selectedContactForForm}
          onSaveContact={handleSaveContact}
          onDeleteContact={handleDeleteContact}
        />
      );
    case 'CallScreen':
      return (
        <CallScreen
          callingContact={callingContact}
          onAnswer={handleAnswerCall}
          onDecline={handleDeclineCall}
        />
      );
    default:
      return null;
  }
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },

  // --- ContactsListScreen Styles (Exploring Page) ---
  headerContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  searchBar: {
    height: 50,
    borderColor: '#d1d8e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fdfefe',
  },
  filterTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#3498db',
  },
  filterTabText: {
    color: '#7f8c8d',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  contactListContent: {
    paddingHorizontal: 20,
    paddingBottom: 80, // Space for floating button
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  contactCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  contactCardPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#ccc',
  },
  contactCardPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#a0a0a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCardPhotoText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  contactCardDetails: {
    flexShrink: 1,
  },
  contactCardMainName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  contactCardSecondaryDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  contactCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactCardCallButton: {
    backgroundColor: '#2ecc71',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  contactCardCallButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  noResultsText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
  },
  noContactsYetText: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
    lineHeight: 25,
  },
  addContactFloatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#3498db',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  addContactFloatingButtonText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
  },

  // --- ContactFormScreen Styles (Filling Page) ---
  formScrollViewContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  formHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
  },
  formHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    flex: 1,
  },
  deleteButton: {
    padding: 10,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoPickerButton: {
    alignItems: 'center',
  },
  formPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    backgroundColor: '#ccc',
  },
  formPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    backgroundColor: '#a0a0a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formPhotoPlaceholderText: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  photoPickerButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 10,
  },
  input: {
    height: 50,
    borderColor: '#d1d8e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#34495e',
    backgroundColor: '#fdfefe',
  },
  // Radio button styles
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d8e0',
    backgroundColor: '#fdfefe',
    minWidth: '48%', // Approx half width for two columns
    justifyContent: 'flex-start',
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedRadioCircle: {
    borderColor: '#3498db',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3498db',
  },
  radioLabel: {
    fontSize: 16,
    color: '#34495e',
  },
  saveButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2980b9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // --- CallScreen Styles ---
  callScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  callBackgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  callInfoOverlay: {
    position: 'absolute',
    top: '15%',
    alignItems: 'center',
    width: '90%',
  },
  initialsContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  initialsText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  callingNamePrimary: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  callingNameSecondary: {
    fontSize: 22,
    color: '#ffffff',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 8,
  },
  callActions: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  answerButton: {
    backgroundColor: '#2ecc71',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: '#e74c3c',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonIcon: {
    color: '#ffffff',
    fontSize: 28,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
});
