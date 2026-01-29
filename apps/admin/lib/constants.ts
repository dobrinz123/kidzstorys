// Theme colors matching mobile app
export const COLORS = {
  primary: {
    50: '#F3E8FF',
    100: '#E9D5FF',
    200: '#D8B4FE',
    300: '#C084FC',
    400: '#A855F7',
    500: '#7C4DFF',
    600: '#6D28D9',
    700: '#5B21B6',
    800: '#4C1D95',
    900: '#3B1578',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// Category icon mapping (matches mobile app)
export const CATEGORY_ICONS: Record<string, string> = {
  bedtime: '🌙',
  'calm-down': '🧘',
  emotions: '💜',
  'leo-penny': '🦁',
  'milo-rubina-fini': '🦊',
  'learn-to-read': '📚',
  curiosities: '🔬',
};

// All available icons for category selection (organized by theme)
export const AVAILABLE_CATEGORY_ICONS: { category: string; icons: { key: string; icon: string; label: string }[] }[] = [
  {
    category: 'Sleep & Relaxation',
    icons: [
      { key: 'moon', icon: '🌙', label: 'Moon' },
      { key: 'star', icon: '⭐', label: 'Star' },
      { key: 'stars', icon: '✨', label: 'Sparkles' },
      { key: 'night', icon: '🌃', label: 'Night' },
      { key: 'bed', icon: '🛏️', label: 'Bed' },
      { key: 'sleep', icon: '😴', label: 'Sleep' },
      { key: 'dream', icon: '💭', label: 'Dream' },
      { key: 'cloud', icon: '☁️', label: 'Cloud' },
      { key: 'rainbow', icon: '🌈', label: 'Rainbow' },
      { key: 'meditation', icon: '🧘', label: 'Meditation' },
      { key: 'peace', icon: '☮️', label: 'Peace' },
      { key: 'lotus', icon: '🪷', label: 'Lotus' },
    ],
  },
  {
    category: 'Animals',
    icons: [
      { key: 'lion', icon: '🦁', label: 'Lion' },
      { key: 'fox', icon: '🦊', label: 'Fox' },
      { key: 'bear', icon: '🐻', label: 'Bear' },
      { key: 'rabbit', icon: '🐰', label: 'Rabbit' },
      { key: 'cat', icon: '🐱', label: 'Cat' },
      { key: 'dog', icon: '🐶', label: 'Dog' },
      { key: 'owl', icon: '🦉', label: 'Owl' },
      { key: 'butterfly', icon: '🦋', label: 'Butterfly' },
      { key: 'unicorn', icon: '🦄', label: 'Unicorn' },
      { key: 'dragon', icon: '🐉', label: 'Dragon' },
      { key: 'turtle', icon: '🐢', label: 'Turtle' },
      { key: 'penguin', icon: '🐧', label: 'Penguin' },
      { key: 'elephant', icon: '🐘', label: 'Elephant' },
      { key: 'monkey', icon: '🐵', label: 'Monkey' },
      { key: 'bird', icon: '🐦', label: 'Bird' },
      { key: 'fish', icon: '🐟', label: 'Fish' },
      { key: 'bee', icon: '🐝', label: 'Bee' },
      { key: 'ladybug', icon: '🐞', label: 'Ladybug' },
      { key: 'frog', icon: '🐸', label: 'Frog' },
      { key: 'panda', icon: '🐼', label: 'Panda' },
    ],
  },
  {
    category: 'Emotions & Feelings',
    icons: [
      { key: 'heart-purple', icon: '💜', label: 'Purple Heart' },
      { key: 'heart-red', icon: '❤️', label: 'Red Heart' },
      { key: 'heart-pink', icon: '💖', label: 'Pink Heart' },
      { key: 'heart-yellow', icon: '💛', label: 'Yellow Heart' },
      { key: 'heart-blue', icon: '💙', label: 'Blue Heart' },
      { key: 'heart-green', icon: '💚', label: 'Green Heart' },
      { key: 'smile', icon: '😊', label: 'Smile' },
      { key: 'happy', icon: '😄', label: 'Happy' },
      { key: 'love', icon: '🥰', label: 'Love' },
      { key: 'hug', icon: '🤗', label: 'Hug' },
      { key: 'thinking', icon: '🤔', label: 'Thinking' },
      { key: 'brave', icon: '💪', label: 'Brave' },
    ],
  },
  {
    category: 'Learning & Education',
    icons: [
      { key: 'book', icon: '📚', label: 'Books' },
      { key: 'book-open', icon: '📖', label: 'Open Book' },
      { key: 'notebook', icon: '📓', label: 'Notebook' },
      { key: 'pencil', icon: '✏️', label: 'Pencil' },
      { key: 'graduation', icon: '🎓', label: 'Graduation' },
      { key: 'school', icon: '🏫', label: 'School' },
      { key: 'abc', icon: '🔤', label: 'ABC' },
      { key: 'numbers', icon: '🔢', label: 'Numbers' },
      { key: 'lightbulb', icon: '💡', label: 'Idea' },
      { key: 'brain', icon: '🧠', label: 'Brain' },
      { key: 'magnify', icon: '🔍', label: 'Search' },
      { key: 'puzzle', icon: '🧩', label: 'Puzzle' },
    ],
  },
  {
    category: 'Science & Discovery',
    icons: [
      { key: 'microscope', icon: '🔬', label: 'Microscope' },
      { key: 'telescope', icon: '🔭', label: 'Telescope' },
      { key: 'rocket', icon: '🚀', label: 'Rocket' },
      { key: 'planet', icon: '🪐', label: 'Planet' },
      { key: 'earth', icon: '🌍', label: 'Earth' },
      { key: 'sun', icon: '☀️', label: 'Sun' },
      { key: 'atom', icon: '⚛️', label: 'Atom' },
      { key: 'dna', icon: '🧬', label: 'DNA' },
      { key: 'magnet', icon: '🧲', label: 'Magnet' },
      { key: 'crystal', icon: '💎', label: 'Crystal' },
      { key: 'volcano', icon: '🌋', label: 'Volcano' },
      { key: 'dinosaur', icon: '🦕', label: 'Dinosaur' },
    ],
  },
  {
    category: 'Nature & Outdoors',
    icons: [
      { key: 'tree', icon: '🌳', label: 'Tree' },
      { key: 'flower', icon: '🌸', label: 'Flower' },
      { key: 'sunflower', icon: '🌻', label: 'Sunflower' },
      { key: 'leaf', icon: '🍃', label: 'Leaf' },
      { key: 'mountain', icon: '⛰️', label: 'Mountain' },
      { key: 'ocean', icon: '🌊', label: 'Ocean' },
      { key: 'camping', icon: '🏕️', label: 'Camping' },
      { key: 'forest', icon: '🌲', label: 'Forest' },
      { key: 'garden', icon: '🌷', label: 'Garden' },
      { key: 'mushroom', icon: '🍄', label: 'Mushroom' },
      { key: 'cactus', icon: '🌵', label: 'Cactus' },
      { key: 'snowflake', icon: '❄️', label: 'Snowflake' },
    ],
  },
  {
    category: 'Adventure & Fantasy',
    icons: [
      { key: 'castle', icon: '🏰', label: 'Castle' },
      { key: 'crown', icon: '👑', label: 'Crown' },
      { key: 'wand', icon: '🪄', label: 'Magic Wand' },
      { key: 'fairy', icon: '🧚', label: 'Fairy' },
      { key: 'mermaid', icon: '🧜‍♀️', label: 'Mermaid' },
      { key: 'wizard', icon: '🧙', label: 'Wizard' },
      { key: 'superhero', icon: '🦸', label: 'Superhero' },
      { key: 'pirate', icon: '🏴‍☠️', label: 'Pirate' },
      { key: 'treasure', icon: '💰', label: 'Treasure' },
      { key: 'map', icon: '🗺️', label: 'Map' },
      { key: 'compass', icon: '🧭', label: 'Compass' },
      { key: 'knight', icon: '⚔️', label: 'Knight' },
    ],
  },
  {
    category: 'Arts & Creativity',
    icons: [
      { key: 'art', icon: '🎨', label: 'Art Palette' },
      { key: 'music', icon: '🎵', label: 'Music' },
      { key: 'guitar', icon: '🎸', label: 'Guitar' },
      { key: 'piano', icon: '🎹', label: 'Piano' },
      { key: 'theater', icon: '🎭', label: 'Theater' },
      { key: 'camera', icon: '📷', label: 'Camera' },
      { key: 'crayon', icon: '🖍️', label: 'Crayon' },
      { key: 'scissors', icon: '✂️', label: 'Scissors' },
      { key: 'yarn', icon: '🧶', label: 'Yarn' },
      { key: 'brush', icon: '🖌️', label: 'Brush' },
      { key: 'microphone', icon: '🎤', label: 'Microphone' },
      { key: 'film', icon: '🎬', label: 'Film' },
    ],
  },
  {
    category: 'Food & Cooking',
    icons: [
      { key: 'apple', icon: '🍎', label: 'Apple' },
      { key: 'cake', icon: '🎂', label: 'Cake' },
      { key: 'cookie', icon: '🍪', label: 'Cookie' },
      { key: 'ice-cream', icon: '🍦', label: 'Ice Cream' },
      { key: 'pizza', icon: '🍕', label: 'Pizza' },
      { key: 'cooking', icon: '👨‍🍳', label: 'Chef' },
      { key: 'fruits', icon: '🍇', label: 'Fruits' },
      { key: 'vegetables', icon: '🥕', label: 'Vegetables' },
      { key: 'milk', icon: '🥛', label: 'Milk' },
      { key: 'honey', icon: '🍯', label: 'Honey' },
      { key: 'bread', icon: '🍞', label: 'Bread' },
      { key: 'candy', icon: '🍬', label: 'Candy' },
    ],
  },
  {
    category: 'Family & Friends',
    icons: [
      { key: 'family', icon: '👨‍👩‍👧‍👦', label: 'Family' },
      { key: 'friends', icon: '👫', label: 'Friends' },
      { key: 'baby', icon: '👶', label: 'Baby' },
      { key: 'child', icon: '🧒', label: 'Child' },
      { key: 'grandparents', icon: '👴👵', label: 'Grandparents' },
      { key: 'house', icon: '🏠', label: 'House' },
      { key: 'handshake', icon: '🤝', label: 'Handshake' },
      { key: 'gift', icon: '🎁', label: 'Gift' },
      { key: 'party', icon: '🎉', label: 'Party' },
      { key: 'balloon', icon: '🎈', label: 'Balloon' },
      { key: 'teddy', icon: '🧸', label: 'Teddy Bear' },
      { key: 'toys', icon: '🪀', label: 'Toys' },
    ],
  },
  {
    category: 'Sports & Activities',
    icons: [
      { key: 'soccer', icon: '⚽', label: 'Soccer' },
      { key: 'basketball', icon: '🏀', label: 'Basketball' },
      { key: 'swimming', icon: '🏊', label: 'Swimming' },
      { key: 'bicycle', icon: '🚴', label: 'Bicycle' },
      { key: 'running', icon: '🏃', label: 'Running' },
      { key: 'dancing', icon: '💃', label: 'Dancing' },
      { key: 'yoga', icon: '🧘‍♀️', label: 'Yoga' },
      { key: 'trophy', icon: '🏆', label: 'Trophy' },
      { key: 'medal', icon: '🏅', label: 'Medal' },
      { key: 'playground', icon: '🛝', label: 'Playground' },
      { key: 'kite', icon: '🪁', label: 'Kite' },
      { key: 'skateboard', icon: '🛹', label: 'Skateboard' },
    ],
  },
  {
    category: 'Seasons & Holidays',
    icons: [
      { key: 'spring', icon: '🌸', label: 'Spring' },
      { key: 'summer', icon: '🌞', label: 'Summer' },
      { key: 'autumn', icon: '🍂', label: 'Autumn' },
      { key: 'winter', icon: '⛄', label: 'Winter' },
      { key: 'christmas', icon: '🎄', label: 'Christmas' },
      { key: 'easter', icon: '🐣', label: 'Easter' },
      { key: 'halloween', icon: '🎃', label: 'Halloween' },
      { key: 'birthday', icon: '🎂', label: 'Birthday' },
      { key: 'valentine', icon: '💝', label: 'Valentine' },
      { key: 'fireworks', icon: '🎆', label: 'Fireworks' },
      { key: 'pumpkin', icon: '🎃', label: 'Pumpkin' },
      { key: 'santa', icon: '🎅', label: 'Santa' },
    ],
  },
];

// Category colors for charts
export const CATEGORY_COLORS: Record<string, string> = {
  bedtime: '#8B5CF6',      // Purple
  'calm-down': '#06B6D4',  // Cyan
  emotions: '#EC4899',     // Pink
  'leo-penny': '#F59E0B',
  'milo-rubina-fini': '#EF4444',
  'learn-to-read': '#10B981', // Green
  curiosities: '#3B82F6',  // Blue
};

// Languages supported
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
] as const;

// Age ranges
export const AGE_RANGES = [
  { min: 2, max: 4, label: '2-4 years' },
  { min: 3, max: 6, label: '3-6 years' },
  { min: 4, max: 7, label: '4-7 years' },
  { min: 5, max: 8, label: '5-8 years' },
  { min: 6, max: 10, label: '6-10 years' },
] as const;

// Duration options (in minutes)
export const DURATION_OPTIONS = [
  { value: 3, label: '3 minutes' },
  { value: 5, label: '5 minutes' },
  { value: 7, label: '7 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
] as const;

// Book statuses
export const BOOK_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'ready', label: 'Ready to Publish', color: 'warning' },
  { value: 'published', label: 'Published', color: 'success' },
] as const;

// Subscription types
export const SUBSCRIPTION_TYPES = [
  { value: 'monthly', label: 'Monthly', color: 'info' },
  { value: 'yearly', label: 'Yearly', color: 'success' },
  { value: 'trial', label: 'Trial', color: 'warning' },
] as const;

// User roles
export const USER_ROLES = [
  { value: 'admin', label: 'Administrator', description: 'Full access to all features' },
  { value: 'editor', label: 'Editor', description: 'Can create and edit books' },
] as const;

// New arrivals window (in days)
export const NEW_ARRIVALS_DAYS = 7;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// File upload limits
export const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB for high quality content
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Text limits
export const MAX_TITLE_LENGTH = 100;
export const MAX_PAGE_TEXT_LENGTH = 1000;
export const MAX_TAG_LENGTH = 50;
export const MAX_TAGS_PER_LANGUAGE = 10;
export const MAX_PARENT_QUESTIONS = 5;

// Validation messages
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  titleRequired: 'Title is required in all languages',
  imageRequired: 'Image is required',
  textRequired: 'Text is required in all languages',
  categoryRequired: 'Please select a category',
  ageRequired: 'Please set age range',
  durationRequired: 'Please set duration',
  minPages: 'Book must have at least 1 page',
  invalidEmail: 'Please enter a valid email',
  invalidPassword: 'Password must be at least 8 characters',
} as const;

// Chart colors for statistics
export const CHART_COLORS = {
  primary: '#7C4DFF',
  secondary: '#C084FC',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray: '#9CA3AF',
};

// Time periods for statistics
export const TIME_PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
] as const;

// Helper function to get icon by key
export function getCategoryIconByKey(iconKey: string): string {
  // First check legacy CATEGORY_ICONS
  if (CATEGORY_ICONS[iconKey]) {
    return CATEGORY_ICONS[iconKey];
  }
  // Then check AVAILABLE_CATEGORY_ICONS
  for (const group of AVAILABLE_CATEGORY_ICONS) {
    const found = group.icons.find(i => i.key === iconKey);
    if (found) return found.icon;
  }
  // Default fallback
  return '📚';
}
