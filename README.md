My Simplified Contacts App
🌟 The Problem I Tackled
Ever found yourself staring at an incoming call, trying to decipher a contact name like "Hyd- Ravi Audi Dealer Sharma's brother" and wondering, "Wait, which Ravi is this?!" I certainly did, looking at my parents' phones! It's a common struggle: contact names often become long, unstructured strings that fail us precisely when we need instant recognition – during an incoming call. This not only clutters the screen but can lead to awkward "Who is this?" moments.




<img src="https://github.com/user-attachments/assets/0a5ad830-873d-4d68-9dbc-4a4a176cc754" alt="Alt Text" width="300" height="500">
<img src="https://github.com/user-attachments/assets/a847e20e-c93b-47c2-b335-47b5045d6425" alt="Alt Text" width="300" height="500">


I saw a problem, and instead of waiting for a project brief, I decided to build a solution myself.

✨ My Solution: A Smarter Contacts App
This application is my answer to the cluttered contact list. It's designed from the ground up to offer a clean, intuitive user experience, ensuring you always know who's calling, with all the context you need, presented beautifully.

Key Features:
Structured Contact Details: Say goodbye to long, messy names! Store contacts with distinct fields for:

Name

Phone Number

Email Address

Location (City, Area)

Profession/Title

Reference/Relationship (e.g., "Ana's brother")

Intuitive Photo Management: Easily import contact photos directly from your mobile device's local storage. No more manual URL pasting!

Personalized Call Screen Display: This is the core magic! You decide exactly how a contact's name appears when they call. Choose from options like:

Name Only

Name + Location (e.g., "Ravi (Hyderabad)")

Name + Profession (e.g., "Ravi (Audi Dealer)")

Name + Reference/Relationship (e.g., "Ravi (Sharma's brother)")
This preference is saved per contact, ensuring immediate recognition.

Visually Stunning Call Screen: Experience an iOS-inspired full-screen call interface. If a contact has a photo, it's displayed beautifully as the background. If not, a sleek, blurred gradient with their initials ensures a premium look.

Real-time Data Persistence: All your contacts are securely saved and synchronized in real-time using Google Firebase Firestore, so your data is always up-to-date across sessions.

Seamless User Interface: Focused on a smooth and delightful user experience, from adding contacts with user-friendly radio buttons for display preferences, to quick search and intuitive navigation.

📸 Screenshots





<img src="https://github.com/user-attachments/assets/c9f48277-303f-4943-9a08-12592fd49ba3" alt="Alt Text" width="300" height="500">
<img src="https://github.com/user-attachments/assets/1cccfebe-bdb2-432a-a30a-55924eb3dbf7" alt="Alt Text" width="300" height="500">
<img src="https://github.com/user-attachments/assets/d581750d-81e1-450c-9afd-72c7a0681558" alt="Alt Text" width="300" height="500">
<img src="https://github.com/user-attachments/assets/19bb78e3-f3fb-4f63-9772-5ef09ad6ce13" alt="Alt Text" width="300" height="500">
<img src="https://github.com/user-attachments/assets/711d5115-97b9-4aea-b994-38832d9860c9" alt="Alt Text" width="300" height="500">


🛠 Technologies Used
React Native: For building cross-platform iOS and Android mobile applications.

Expo: The framework for universal React applications, simplifying development and deployment.

Google Firebase:

Firestore: A flexible, scalable NoSQL cloud database for storing and syncing contact data in real-time.

Authentication: For managing user sessions (anonymous sign-in for simplicity in this prototype).

expo-linear-gradient: For creating beautiful gradient backgrounds.

@react-native-picker/picker: The community-maintained Picker component.

@react-native-async-storage/async-storage: For persisting Firebase authentication state between app sessions.

expo-image-picker: For allowing users to select images from their device's photo library.

🚀 Getting Started
Follow these steps to get a local copy of the project up and running on your machine.

Prerequisites
Node.js (LTS version recommended)

npm (Node Package Manager) or Yarn

Expo CLI (npm install -g expo-cli or yarn global add expo-cli)

Expo Go app on your iOS/Android device (download from App Store/Google Play) or an Android Studio/Xcode simulator setup.

Installation
Clone the repository (or download the project files):

git clone https://github.com/your-username/MySimplifiedContactsApp.git
cd MySimplifiedContactsApp

(If you downloaded directly, just cd into your project folder)

Install project dependencies:

npm install
# OR yarn install

Install Expo-specific packages:

expo install expo-linear-gradient @react-native-picker/picker @react-native-async-storage/async-storage firebase expo-image-picker

Firebase Configuration
This app uses Firebase for data persistence. For local development, you need to provide your own Firebase project configuration.

Create a Firebase Project:

Go to Firebase Console.

Create a new project (e.g., MyContactsApp).

Add a Web App:

In your Firebase project, click on the web icon (</>) to add a web app.

Follow the steps to register your app.

Copy the firebaseConfig object provided by Firebase.

Enable Authentication:

In the Firebase Console, navigate to Build > Authentication.

Click "Get started".

Go to the "Sign-in method" tab and enable "Anonymous" sign-in.

Update App.js:

Open App.js in your project.

Locate the firebaseConfig object placeholder at the top of the file:

const firebaseConfig = {
  // REPLACE WITH YOUR ACTUAL FIREBASE CONFIG
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

Replace the placeholder values with your actual firebaseConfig object copied from the Firebase Console.

Running the App
Start the Expo Development Server:

npx expo start

This will open the Expo Dev Tools in your browser.

Open on Your Device/Emulator:

Expo Go App: Scan the QR code displayed in the Expo Dev Tools with the Expo Go app on your phone.

Emulator/Simulator: Click "Run on Android device/emulator" or "Run on iOS simulator" in the Expo Dev Tools.

🚀 Usage
Add Contacts: Tap the floating + button to create new contacts. Fill in details, select a photo from your gallery, and choose your preferred call screen display format.

Explore & Search: Browse your contacts. Use the search bar to quickly find people by name, profession, location, or reference.

Simulate Calls: Tap the 📞 icon on any contact card to see the custom call screen in action, displaying the name exactly as you configured it!

Edit/Delete Contacts: Tap on a contact card (not the call button) to open its details for editing or deletion.

💡 Future Enhancements
Advanced Filtering: Implement full filtering logic for "Favorites," "Work," and "Family" tabs.

Custom Display String Builder: Allow users to create truly custom display formats (e.g., "Name, Profession @ Location").

Phone Number Types: Add options for different phone number types (Mobile, Work, Home) with corresponding icons.

Contact Sharing: Implement functionality to share contact details.

Theming: Allow users to choose different color themes.

Native Contacts Integration: (Advanced, platform-specific) Explore possibilities of syncing with native device contacts (requires deeper native module work).

🙏 Acknowledgements
This project is a testament to the journey of self-driven learning and problem-solving. It's about those moments of triumph after countless debugging sessions, the joy of a working prototype, and the continuous pursuit of making things better. Happy to be a student of tech in now and for always.

Thank you for taking the time to explore my latest task!
