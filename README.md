# Receipts - Personal Budget & Receipt Scanner App

A React Native mobile application for managing personal finances with intelligent receipt scanning and categorization capabilities.

## Features

### 📱 Core Functionality
- **Receipt Scanning**: Take photos or select from gallery to automatically extract transaction data
- **AI-Powered Analysis**: Intelligent categorization of receipt items using backend API
- **Transaction Management**: Add, edit, and organize financial transactions
- **Category System**: Custom categories with icons, colors, and budgets
- **Budget Tracking**: Monitor spending against category budgets
- **Offline Support**: Local storage with sync when online

### 🔐 Authentication
- User authentication via Supabase
- Secure login/registration flow
- Deep linking support for auth callbacks

### 💾 Data Storage
- Local SQLite database for offline functionality
- Supabase backend for cloud sync
- Image storage in local filesystem and Supabase Storage

## Tech Stack

- **Frontend**: React Native
- **Navigation**: React Navigation (Stack & Tab navigators)
- **Database**: SQLite (local) + Supabase (cloud)
- **Authentication**: Supabase Auth
- **Image Processing**: React Native Image Picker
- **File System**: React Native FS
- **Icons**: Feather Icons
- **State Management**: React Context API

## Project Structure

```
src/
├── views/              # Screen components
│   ├── HomeScreen.js
│   ├── TransactionsScreen.js
│   ├── AddTransactionScreen.js
│   ├── BudgetScreen.js
│   ├── SettingsScreen.js
│   └── components/     # Reusable components
├── controllers/        # Business logic
│   └── ImageController.js
├── services/          # API services
│   └── AuthService.js
└── utils/             # Utilities
    ├── supabase.js
    └── CurrencyContext.js
ios/                   # iOS specific files
└── Receipts/
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- iOS development environment (Xcode)
- CocoaPods

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd receipts-app
```

2. **Install dependencies**
```bash
npm install
```

3. **iOS setup**
```bash
cd ios
pod install
cd ..
```



4. **Run the app**
```bash
# iOS
npx react-native run-ios

# Start Metro bundler
npx react-native start
```

## Configuration

### Supabase Setup
1. Create a Supabase project
2. Set up authentication
3. Create storage bucket named 'receipts'
4. Configure database tables for transactions and categories

### Permissions
The app requires the following iOS permissions:
- **Camera**: For taking receipt photos
- **Photo Library**: For selecting images from gallery
- **Microphone**: For video receipts (optional)

## Usage

### Taking Receipt Photos
1. Navigate to Add Transaction screen
2. Tap "Take Photo" or "Choose from Gallery"
3. Select receipt image
4. Tap "Analyze Receipt" for automatic data extraction

### Managing Categories
- Create custom categories with icons and colors
- Set budget limits per category
- Edit or delete existing categories

### Transaction Management
- Manual transaction entry
- Automatic data from receipt analysis
- Edit transaction details
- View transaction history

## API Integration

The app integrates with a backend API for receipt analysis:
- **Endpoint**: `/api/receipt`
- **Method**: POST
- **Payload**: FormData with receipt image and user categories
- **Response**: Extracted products with categorization

## Deep Linking

Supports deep linking for:
- Authentication callbacks: `budgetappka://auth/callback`
- Password reset flows

## Build Configuration

### iOS
- **Bundle ID**: `com.karasie`
- **Deployment Target**: iOS 15.1+
- **Development Team**: 44A863R4BV

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For issues or questions, please contact the development team.
