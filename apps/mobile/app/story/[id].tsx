import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    useWindowDimensions,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    runOnJS,
    Easing,
    Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ALL_STORIES } from "../../src/data/stories";
import { getStoryScene } from "../../src/data/storyScenes";
import { useLanguageStore } from "../../src/store/languageStore";
import { useUserStore } from "../../src/store/userStore";
import { useAudiobookStore } from "../../src/store/audiobookStore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/hooks/useAuth";
import { useSubscription } from "../../src/hooks/useSubscription";
import { usePublishedBook } from "../../src/hooks/useBooks";
import { useAudiobook } from "../../src/hooks/useAudiobook";
import { Audio } from "expo-av";

// Page flip sound
const PAGE_FLIP_SOUND = require("../../assets/sounds/page_flip.mp3");

// Book design tokens
const BOOK_COLORS = {
    pageCream: "#FFF8E7",
    pageEdge: "#F5E6C8",
    textBrown: "#3E2723",
    textSecondary: "#5D4037",
    spine: "#8D6E63",
    spineLight: "#A1887F",
    shadow: "rgba(0,0,0,0.15)",
    background: "#D7CCC8",
    buttonBg: "#6D4C41",
    buttonText: "#FFF8E7",
};

// UI Strings
const UI_STRINGS = {
    ro: {
        back: "\u00cenapoi",
        addToList: "Adaug\u0103 la lista mea",
        removeFromList: "\u0218terge din list\u0103",
        finished: "Ai terminat povestea!",
        backToLibrary: "\u00cenapoi la bibliotec\u0103",
    },
    en: {
        back: "Back",
        addToList: "Add to My List",
        removeFromList: "Remove from List",
        finished: "You finished the story!",
        backToLibrary: "Back to Library",
    },
    it: {
        back: "Indietro",
        addToList: "Aggiungi alla mia lista",
        removeFromList: "Rimuovi dalla lista",
        finished: "Hai finito la storia!",
        backToLibrary: "Torna alla libreria",
    },
};

function splitTextIntoPages(text: string): string[] {
    if (!text) return ["..."];

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const pages: string[] = [];
    let currentPage = "";

    sentences.forEach((sentence) => {
        const trimmed = sentence.trim();
        if (currentPage.length + trimmed.length > 150 && currentPage.length > 0) {
            pages.push(currentPage.trim());
            currentPage = trimmed;
        } else {
            currentPage += (currentPage ? " " : "") + trimmed;
        }
    });

    if (currentPage.trim()) {
        pages.push(currentPage.trim());
    }

    return pages.length > 0 ? pages : ["..."];
}

export default function StoryReader() {
    const router = useRouter();

    const goBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/");
        }
    }, [router]);
    const { id } = useLocalSearchParams();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const [currentPage, setCurrentPage] = useState(0);
    const [isFlipping, setIsFlipping] = useState(false);
    const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set([0]));

    // Use refs so gesture handler always has fresh values
    const currentPageRef = useRef(0);
    const isFlippingRef = useRef(false);
    const totalPagesRef = useRef(1);
    const hasCountedRef = useRef(false);
    const preloadedPagesRef = useRef<Set<number>>(new Set([0]));

    // Convex mutation
    const incrementReadCount = useMutation(api.books.incrementReadCount);

    // Reanimated shared value for page slide
    const slideX = useSharedValue(0);

    // Page flip sound
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        // Preload the sound
        const loadSound = async () => {
            try {
                const { sound } = await Audio.Sound.createAsync(PAGE_FLIP_SOUND);
                soundRef.current = sound;
            } catch (e) {
                console.log("[StoryReader] Could not load page flip sound", e);
            }
        };
        loadSound();

        return () => {
            // Cleanup
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const { isAudiobookEnabled, toggleAudiobook, resetAudiobook } = useAudiobookStore();
    const { playPage, stop, cleanup } = useAudiobook();

    // Reset audiobook toggle when leaving reader — ensures next book opens with toggle OFF.
    // Per AUDIO-04: state persists within a session; reset only on unmount (exit).
    useEffect(() => {
        return () => {
            resetAudiobook();
        };
    }, [resetAudiobook]);

    const playFlipSound = useCallback(async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.replayAsync();
            }
        } catch (e) {
            // Silently fail — sound is non-critical
        }
    }, []);

    const currentLang = useLanguageStore((state) => state.language);
    const ui = UI_STRINGS[currentLang] || UI_STRINGS.ro;

    const { addToMyList, removeFromMyList, updateProgress, removeProgress, incrementView, myList, readingProgress } = useUserStore();
    const isInMyList = myList.includes(id as string);

    const { user: convexUser, isLoading: isAuthLoading } = useAuth();
    const { hasAccess, isLoading: isSubLoading } = useSubscription(convexUser?._id ?? null);

    // Try to load book from Convex first
    const { book: convexBook, isLoading: isBookLoading } = usePublishedBook(id as string);

    // Compute once when book or language changes. Checks if ANY page has completed audio
    // for the current language. Per ANTI-PATTERN note in research: do NOT check per-page
    // to prevent toggle flickering during page turns.
    const bookHasAudio = useMemo(() => {
        if (!convexBook) return false;
        const statusKey = `audioStatus_${currentLang}` as "audioStatus_en" | "audioStatus_ro";
        return convexBook.pages.some((page) => page[statusKey] === "done");
    }, [convexBook, currentLang]);


    // Audio URL for the currently displayed page, in the user's selected language.
    // Returns undefined if: no convexBook, page out of bounds, audioStatus !== 'done', or URL missing.
    // AUDIO-02: language selection via currentLang.
    // AUDIO-06: undefined triggers silent no-op in useAudiobook.playPage.
    const currentAudioUrl = useMemo(() => {
        if (!convexBook) return undefined;
        const page = convexBook.pages[currentPage];
        if (!page) return undefined;
        const statusKey = `audioStatus_${currentLang}` as "audioStatus_en" | "audioStatus_ro";
        if (page[statusKey] !== "done") return undefined;
        const urlKey = `audioUrl_${currentLang}` as "audioUrl_en" | "audioUrl_ro";
        return page[urlKey];
    }, [convexBook, currentPage, currentLang]);

    // Audio URL for the NEXT page. Used for preloading (AUDIO-08).
    const isLoading = isAuthLoading || isSubLoading || isBookLoading;

    // Fallback to static story data if Convex book not found
    const story = useMemo(() => {
        return ALL_STORIES.find((s) => s.id === id) || ALL_STORIES[0];
    }, [id]);

    // Use Convex book data if available, otherwise fall back to static data
    const { text, title } = useMemo(() => {
        // If we have a Convex book, use its data
        if (convexBook) {
            let t = convexBook.cover.title_ro;
            let p = convexBook.cover.title_ro;
            if (currentLang === "en") {
                t = convexBook.cover.title_en;
                p = convexBook.cover.title_en;
            } else if (currentLang === "it") {
                t = convexBook.cover.title_it;
                p = convexBook.cover.title_it;
            }
            // For Convex books, we don't need to split text - pages are already defined
            return { text: "", title: p };
        }

        // Fallback to static story
        if (!story) return { text: "", title: "" };
        let t = story.textRo;
        let p = story.title;
        if (currentLang === "en") {
            t = story.textEn || story.titleEn;
            p = story.titleEn || story.title;
        } else if (currentLang === "it") {
            t = story.textIt || story.titleIt;
            p = story.titleIt || story.title;
        }
        return { text: t || story.textRo || "", title: p };
    }, [convexBook, story, currentLang]);

    // Build pages from Convex book or static data
    const pages = useMemo(() => {
        // If we have a Convex book, use its structured pages
        if (convexBook && convexBook.pages.length > 0) {
            return convexBook.pages.map((page, i) => {
                let pageText = page.text_ro;
                if (currentLang === "en") {
                    pageText = page.text_en;
                } else if (currentLang === "it") {
                    pageText = page.text_it;
                }
                return {
                    text: pageText,
                    // Use Convex image URL if available
                    image: page.imageUrl ? { uri: page.imageUrl } : getStoryScene(id as string, i),
                };
            });
        }

        // Fallback to static story with text splitting
        const textPages = splitTextIntoPages(text);
        return textPages.map((pageText, i) => ({
            text: pageText,
            image: getStoryScene(id as string, i),
        }));
    }, [convexBook, text, id, currentLang]);

    const totalPages = pages.length;

    // Pre-load images aggressively when book loads
    useEffect(() => {
        if (convexBook && convexBook.pages.length > 0) {
            // Prefetch first 5 pages immediately with tracking
            const initialPages = convexBook.pages.slice(0, 5);
            initialPages.forEach((page, idx) => {
                if (page.imageUrl) {
                    Image.prefetch(page.imageUrl)
                        .then(() => {
                            preloadedPagesRef.current.add(idx);
                            setPreloadedPages(new Set(preloadedPagesRef.current));
                        })
                        .catch(() => { });
                } else {
                    // No URL means it's a static image, mark as preloaded
                    preloadedPagesRef.current.add(idx);
                }
            });
            // Also prefetch cover if exists
            if (convexBook.cover.imageUrl) {
                Image.prefetch(convexBook.cover.imageUrl).catch(() => { });
            }
            // Prefetch remaining pages in background
            convexBook.pages.slice(5).forEach((page, idx) => {
                if (page.imageUrl) {
                    Image.prefetch(page.imageUrl)
                        .then(() => {
                            preloadedPagesRef.current.add(idx + 5);
                            setPreloadedPages(new Set(preloadedPagesRef.current));
                        })
                        .catch(() => { });
                } else {
                    preloadedPagesRef.current.add(idx + 5);
                }
            });
        }
    }, [convexBook]);

    // Keep refs in sync
    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);
    useEffect(() => {
        isFlippingRef.current = isFlipping;
    }, [isFlipping]);
    useEffect(() => {
        totalPagesRef.current = totalPages;
    }, [totalPages]);
    useEffect(() => {
        preloadedPagesRef.current = preloadedPages;
    }, [preloadedPages]);

    // Auto-play narration when audiobook is ON and page changes.
    // Uses a cancelled flag to prevent race conditions between cleanup and new playback.
    useEffect(() => {
        if (!isAudiobookEnabled || !currentAudioUrl) return;

        let cancelled = false;

        const onFinish = () => {
            if (cancelled) return;
            // Force-clear flipping state before triggering next page
            setIsFlipping(false);
            isFlippingRef.current = false;
            // Delay to let animation state reset, then turn page
            setTimeout(() => {
                if (!cancelled) {
                    animateToPage(currentPageRef.current + 1);
                }
            }, 300);
        };

        // Wait for page-turn animation to complete, then play audio
        const timer = setTimeout(async () => {
            if (cancelled) return;
            await playPage(currentAudioUrl, onFinish);
        }, 1000); // 1s delay = page-turn animation (~550ms) + buffer

        return () => {
            cancelled = true;
            clearTimeout(timer);
            stop();
        };
    }, [currentPage, isAudiobookEnabled, currentAudioUrl]);

    // Stop audio when audiobook is toggled OFF or component unmounts.
    useEffect(() => {
        if (!isAudiobookEnabled) {
            cleanup();
        }
        return () => { cleanup(); };
    }, [isAudiobookEnabled]);

    // Helper to ensure next page image is loaded before transition
    const ensurePagePreloaded = useCallback(async (pageIdx: number): Promise<void> => {
        // Already preloaded
        if (preloadedPagesRef.current.has(pageIdx)) {
            return;
        }

        // Check if this is a Convex book with URL
        if (convexBook && convexBook.pages[pageIdx]?.imageUrl) {
            try {
                await Image.prefetch(convexBook.pages[pageIdx].imageUrl!);
                preloadedPagesRef.current.add(pageIdx);
                setPreloadedPages(new Set(preloadedPagesRef.current));
            } catch {
                // Failed to prefetch, but continue anyway
            }
        } else {
            // Static image or no URL, mark as ready
            preloadedPagesRef.current.add(pageIdx);
        }
    }, [convexBook]);

    // Animated page transition
    const animateToPage = useCallback(
        async (targetPage: number) => {
            if (isFlippingRef.current) return;
            if (targetPage < 0 || targetPage >= totalPagesRef.current) return;
            if (targetPage === currentPageRef.current) {
                // Snap back
                slideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
                return;
            }

            setIsFlipping(true);
            isFlippingRef.current = true;

            // Safety: force-reset isFlipping after 1.5s in case Reanimated callback doesn't fire
            setTimeout(() => {
                setIsFlipping(false);
                isFlippingRef.current = false;
            }, 1500);

            // Ensure target page image is loaded before animating
            await ensurePagePreloaded(targetPage);

            // Also preload the page after target for smooth sequential reading
            if (targetPage + 1 < totalPagesRef.current) {
                ensurePagePreloaded(targetPage + 1);
            }

            playFlipSound();

            const direction = targetPage > currentPageRef.current ? -1 : 1;

            // Slide current page out
            slideX.value = withTiming(
                direction * width,
                { duration: 300, easing: Easing.inOut(Easing.ease) },
                (finished) => {
                    if (finished) {
                        runOnJS(setCurrentPage)(targetPage);
                        // Instantly position new page on opposite side
                        slideX.value = -direction * width * 0.3;
                        // Slide new page in
                        slideX.value = withTiming(
                            0,
                            { duration: 250, easing: Easing.out(Easing.cubic) },
                            (finished2) => {
                                if (finished2) {
                                    runOnJS(setIsFlipping)(false);
                                }
                            }
                        );
                    }
                }
            );
        },
        [slideX, width, ensurePagePreloaded]
    );

    // Gesture handler for swipe
    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetX([-20, 20])
                .onUpdate((event) => {
                    // Live drag feedback
                    slideX.value = event.translationX * 0.5;
                })
                .onEnd((event) => {
                    const threshold = width / 5;
                    const page = currentPageRef.current;
                    const total = totalPagesRef.current;

                    if (event.translationX < -threshold && page < total - 1) {
                        runOnJS(animateToPage)(page + 1);
                    } else if (event.translationX > threshold && page > 0) {
                        runOnJS(animateToPage)(page - 1);
                    } else {
                        // Snap back
                        slideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
                    }
                }),
        [slideX, width, animateToPage]
    );

    // --- ANIMATION STYLES 3D ---

    // Style for the "Next" flipper (Right page flips to Left)
    // Pivot is LEFT edge of the right-positioned view.
    const flipNextStyle = useAnimatedStyle(() => {
        if (!isLandscape || slideX.value > 0) return { opacity: 0, zIndex: -1 }; // Hide if not flipping next

        // 0 -> -180 degrees (Right to Left)
        const rotation = interpolate(
            slideX.value,
            [-width, 0],
            [-180, 0], // Map slide -width to -180deg flip. At 0 drag -> 0 rotation.
            Extrapolation.CLAMP
        );

        // Pivot: Left edge of a view that is on the right half.
        // View center is at width*0.75 relative to screen, or local center.
        // Correct pivot for a Right-Half view rotating around its Left edge is translateX(-width/4)
        const pivotX = -width * 0.25;

        return {
            opacity: 1,
            zIndex: 1000,
            transform: [
                { perspective: 2500 },
                { translateX: pivotX },
                { rotateY: `${rotation}deg` },
                { translateX: -pivotX },
            ],
        };
    }, [isLandscape, width]);

    // Style for the "Prev" flipper (Left page flips to Right)
    // Pivot is RIGHT edge of the left-positioned view.
    const flipPrevStyle = useAnimatedStyle(() => {
        if (!isLandscape || slideX.value <= 0) return { opacity: 0, zIndex: -1 }; // Hide if not flipping prev

        // 0 -> 180 degrees (Left to Right)
        // slideX goes 0 -> width
        const rotation = interpolate(
            slideX.value,
            [0, width],
            [0, 180],
            Extrapolation.CLAMP
        );

        // Pivot: Right edge of a view that is on the left half.
        // View center is local. Pivot is +width/4 relative to its center.
        const pivotX = width * 0.25;

        return {
            opacity: 1,
            zIndex: 1000,
            transform: [
                { perspective: 2500 },
                { translateX: pivotX },
                { rotateY: `${rotation}deg` },
                { translateX: -pivotX },
            ],
        };
    }, [isLandscape, width]);

    const bgNextStyle = useAnimatedStyle(() => {
        if (!isLandscape) return { opacity: 0, zIndex: -10 };
        return {
            opacity: slideX.value < 0 ? 1 : 0,
            zIndex: slideX.value < 0 ? 0 : -10
        };
    }, [isLandscape]);

    const bgPrevStyle = useAnimatedStyle(() => {
        if (!isLandscape) return { opacity: 0, zIndex: -10 };
        return {
            opacity: slideX.value > 0 ? 1 : 0,
            zIndex: slideX.value > 0 ? 0 : -10
        };
    }, [isLandscape]);

    // Helper for flipping content visibility (Front/Back faces)
    // Since we have 2 flippers, we can just genericize or duplicate for simplicity
    const nextFrontFaceStyle = useAnimatedStyle(() => {
        if (!isLandscape) return { opacity: 1 };
        // Visible when rotation > -90. Rotation goes 0 -> -180.
        // So visible from 0 to -90.
        const rotation = interpolate(slideX.value, [-width, 0], [-180, 0], Extrapolation.CLAMP);
        return {
            opacity: rotation > -90 ? 1 : 0,
            zIndex: rotation > -90 ? 10 : 0,
        };
    }, [isLandscape, width]);

    const nextBackFaceStyle = useAnimatedStyle(() => {
        if (!isLandscape) return { opacity: 0 };
        // Visible when rotation <= -90.
        const rotation = interpolate(slideX.value, [-width, 0], [-180, 0], Extrapolation.CLAMP);
        return {
            opacity: rotation <= -90 ? 1 : 0,
            zIndex: rotation <= -90 ? 10 : 0,
            transform: [{ rotateY: '180deg' }],
        };
    }, [isLandscape, width]);

    const prevFrontFaceStyle = useAnimatedStyle(() => {
        if (!isLandscape) return { opacity: 1 };
        // Rotation goes 0 -> 180. Visible 0 to 90.
        const rotation = interpolate(slideX.value, [0, width], [0, 180], Extrapolation.CLAMP);
        return {
            opacity: rotation < 90 ? 1 : 0,
            zIndex: rotation < 90 ? 10 : 0,
        };
    }, [isLandscape, width]);

    const prevBackFaceStyle = useAnimatedStyle(() => {
        if (!isLandscape) return { opacity: 0 };
        // Visible 90 to 180.
        const rotation = interpolate(slideX.value, [0, width], [0, 180], Extrapolation.CLAMP);
        return {
            opacity: rotation >= 90 ? 1 : 0,
            zIndex: rotation >= 90 ? 10 : 0,
            transform: [{ rotateY: '180deg' }],
        };
    }, [isLandscape, width]);

    // Portrait slide style (unchanged)
    const pageSlideStyle = useAnimatedStyle(() => {
        if (isLandscape) return {};
        // Standard Portrait Slide
        const opacity = interpolate(
            Math.abs(slideX.value),
            [0, width * 0.5, width],
            [1, 0.7, 0.3],
            Extrapolation.CLAMP
        );
        const scale = interpolate(
            Math.abs(slideX.value),
            [0, width],
            [1, 0.92],
            Extrapolation.CLAMP
        );
        return {
            transform: [
                { translateX: slideX.value },
                { scale },
            ],
            opacity,
        };
    }, [isLandscape, width]);

    // Subscription & progress effects
    useEffect(() => {
        if (!isLoading && hasAccess === false) {
            router.replace("/paywall");
        }
    }, [hasAccess, isLoading, router]);

    useEffect(() => {
        if (story && hasAccess) {
            incrementView(story.id);
            const savedPage = readingProgress[story.id];
            if (savedPage && savedPage > 0 && savedPage < (pages?.length || 0)) {
                setCurrentPage(savedPage);
            }
        }
    }, [story?.id, hasAccess]);

    useEffect(() => {
        if (story && hasAccess) {
            if (currentPage === totalPages - 1 && totalPages > 1) {
                if (!hasCountedRef.current) {
                    incrementReadCount({ bookKey: story.id })
                        .catch(err => console.log("[StoryReader] Failed to update read count:", err));
                    hasCountedRef.current = true;
                }
                removeProgress(story.id);
            } else {
                updateProgress(story.id, currentPage);
            }
        }
    }, [currentPage, story?.id, hasAccess, totalPages]);

    // Pre-load next pages when current page changes (must be before early return to follow React hooks rules)
    useEffect(() => {
        // Prefetch next 3 pages aggressively
        const pagesToPrefetch = [currentPage + 1, currentPage + 2, currentPage + 3];
        pagesToPrefetch.forEach((pageIdx) => {
            if (pageIdx < totalPages && !preloadedPagesRef.current.has(pageIdx)) {
                ensurePagePreloaded(pageIdx);
            }
        });
    }, [currentPage, totalPages, ensurePagePreloaded]);

    if (isLoading || !hasAccess) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BOOK_COLORS.spine} />
            </View>
        );
    }

    const goToPage = (page: number) => {
        if (page >= 0 && page < totalPages && !isFlipping) {
            animateToPage(page);
        }
    };

    const toggleMyList = () => {
        if (isInMyList) {
            removeFromMyList(story!.id);
        } else {
            addToMyList(story!.id);
        }
    };

    const currentPageData = pages[currentPage] || pages[0];
    if (!currentPageData) return null;

    // Responsive sizes
    // Responsive sizes
    const contentPadding = isLandscape ? 12 : 16;
    const pageBorderRadius = 16;

    // Dynamic font size calculation
    const getDynamicFontSize = () => {
        const textLength = currentPageData.text.length;
        const screenDiagonal = Math.sqrt(width * width + height * height);
        const isTablet = screenDiagonal > 1000; // Rough heuristic

        // Base size depending on device and orientation
        let baseSize = isTablet ? 32 : 24;
        if (isLandscape) baseSize = isTablet ? 28 : 22;

        // Scale based on text length
        if (textLength < 50) return baseSize * 1.8; // Very short text
        if (textLength < 100) return baseSize * 1.5;
        if (textLength < 200) return baseSize * 1.25;
        if (textLength < 350) return baseSize;      // Standard
        if (textLength < 500) return baseSize * 0.9;
        return baseSize * 0.85; // Long text
    };

    const textFontSize = getDynamicFontSize();

    // Check if current page is preloaded
    const isCurrentPagePreloaded = preloadedPages.has(currentPage);

    // Render image page content for a specific page index
    const renderSpecificImage = (index: number) => {
        const pageData = pages[index];
        if (!pageData) return null;

        const isPreloaded = preloadedPages.has(index);

        return (
            <View style={{ width: "100%", height: "100%" }}>
                {pageData.image ? (
                    <>
                        {!isPreloaded && (
                            <View style={styles.imagePlaceholder}>
                                <ActivityIndicator size="large" color={BOOK_COLORS.spine} />
                            </View>
                        )}
                        <Image
                            source={pageData.image}
                            style={[styles.imageFullPage, !isPreloaded && { opacity: 0 }]}
                            resizeMode="contain"
                            onLoad={() => {
                                if (!preloadedPagesRef.current.has(index)) {
                                    preloadedPagesRef.current.add(index);
                                    setPreloadedPages(new Set(preloadedPagesRef.current));
                                }
                            }}
                        />
                    </>
                ) : (
                    <View style={styles.emptyIllustration}>
                        <View style={styles.emptyIllustrationInner} />
                    </View>
                )}
            </View>
        );
    };

    // Helper for backward compatibility with current render
    const renderImageContent = () => renderSpecificImage(currentPage);

    // Render text page content for a specific page index
    const renderSpecificText = (index: number) => {
        const pageData = pages[index];
        if (!pageData) return null;

        // Dynamic font size logic (re-calculated for this specific page)
        const getFontSizeForPage = (txt: string) => {
            const len = txt.length;
            const screenDiagonal = Math.sqrt(width * width + height * height);
            const isTablet = screenDiagonal > 1000;
            let baseSize = isTablet ? 32 : 24;
            if (isLandscape) baseSize = isTablet ? 28 : 22;
            if (len < 50) return baseSize * 1.8;
            if (len < 100) return baseSize * 1.5;
            if (len < 200) return baseSize * 1.25;
            if (len < 350) return baseSize;
            if (len < 500) return baseSize * 0.9;
            return baseSize * 0.85;
        };

        const fontSize = getFontSizeForPage(pageData.text);

        return (
            <View style={{ flex: 1, width: "100%" }}>
                <ScrollView
                    style={{ flex: 1, width: "100%" }}
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingVertical: 10
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.textPageContent}>
                        <Text
                            style={[
                                styles.storyText,
                                {
                                    fontSize: fontSize,
                                    lineHeight: fontSize * (fontSize > 30 ? 1.3 : 1.5)
                                },
                            ]}
                        >
                            {pageData.text}
                        </Text>
                    </View>
                    <Text style={styles.pageOrnament}>
                        {"~ "}{index + 1}{" ~"}
                    </Text>

                    {index === totalPages - 1 && (
                        <View style={styles.endActionContainer}>
                            <Text style={styles.endTitle}>{ui.finished}</Text>
                            <TouchableOpacity style={styles.libraryButton} onPress={goBack}>
                                <Text style={styles.libraryButtonText}>
                                    {ui.backToLibrary}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton} onPress={toggleMyList}>
                                <Text style={styles.actionButtonText}>
                                    {isInMyList ? ui.removeFromList : ui.addToList}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    };

    // Helper for backward compatibility
    const renderTextContent = () => renderSpecificText(currentPage);

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={goBack}>
                    <Text style={styles.backText}>{"\u2190"} {ui.back}</Text>
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>

                {/* Audiobook toggle button */}
                {convexBook && bookHasAudio && hasAccess && (
                    <TouchableOpacity
                        style={[styles.audiobookToggle, isAudiobookEnabled && styles.audiobookToggleActive]}
                        onPress={toggleAudiobook}
                        accessibilityLabel={isAudiobookEnabled ? "Turn off audiobook" : "Turn on audiobook"}
                        accessibilityRole="button"
                    >
                        <Text style={styles.audiobookIcon}>🎧</Text>
                    </TouchableOpacity>
                )}

                {/* Lock icon for non-PREMIUM users */}
                {convexBook && bookHasAudio && !hasAccess && (
                    <TouchableOpacity
                        style={styles.audiobookToggle}
                        onPress={() => router.push("/(paywall)")}
                        accessibilityLabel="Unlock audiobook"
                        accessibilityRole="button"
                    >
                        <Text style={styles.audiobookIcon}>🔒</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.pageNumber}>
                    {currentPage + 1} / {totalPages}
                </Text>
            </View>

            {/* Book Content with gesture */}
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        styles.bookContent,
                        isLandscape ? styles.bookContentLandscape : styles.bookContentPortrait,
                        pageSlideStyle,
                    ]}
                >
                    {isLandscape ? (
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            {/* LAYER 1: NEXT SPREAD (Static Background) */}
                            {/* Visible when flipping NEXT (slideX < 0) */}
                            {/* LAYER 1: NEXT SPREAD (Static Background) */}
                            {/* Visible when flipping NEXT (slideX < 0). Shows Page + 1 */}
                            <Animated.View style={[
                                styles.landscapeSpread,
                                { position: 'absolute', width: '100%', height: '100%', zIndex: 0 },
                                bgNextStyle
                            ]}>
                                {(() => {
                                    const targetIdx = currentPage + 1;
                                    const safeTarget = Math.max(0, Math.min(targetIdx, totalPages - 1));
                                    return (
                                        <>
                                            {/* FIXED LAYOUT: Text Left, Image Right */}
                                            <View style={[styles.paperPage, styles.leftPage, { borderRadius: pageBorderRadius, padding: contentPadding }]}>
                                                {renderSpecificText(safeTarget)}
                                            </View>
                                            <View style={styles.spine} />
                                            <View style={[styles.paperPage, styles.rightPage, { borderRadius: pageBorderRadius, padding: contentPadding }]}>
                                                {renderSpecificImage(safeTarget)}
                                            </View>
                                        </>
                                    );
                                })()}
                            </Animated.View>

                            {/* LAYER 1: PREV SPREAD (Static Background) */}
                            {/* Visible when flipping PREV (slideX > 0). Shows Page - 1 */}
                            <Animated.View style={[
                                styles.landscapeSpread,
                                { position: 'absolute', width: '100%', height: '100%', zIndex: 0 },
                                bgPrevStyle
                            ]}>
                                {(() => {
                                    const targetIdx = currentPage - 1;
                                    const safeTarget = Math.max(0, Math.min(targetIdx, totalPages - 1));
                                    return (
                                        <>
                                            {/* FIXED LAYOUT: Text Left, Image Right */}
                                            <View style={[styles.paperPage, styles.leftPage, { borderRadius: pageBorderRadius, padding: contentPadding }]}>
                                                {renderSpecificText(safeTarget)}
                                            </View>
                                            <View style={styles.spine} />
                                            <View style={[styles.paperPage, styles.rightPage, { borderRadius: pageBorderRadius, padding: contentPadding }]}>
                                                {renderSpecificImage(safeTarget)}
                                            </View>
                                        </>
                                    );
                                })()}
                            </Animated.View>

                            {/* LAYER 2: CURRENT SPREAD STATIC (Depends on direction) */}
                            {/* FIXED LAYOUT: Left is Text, Right is Image */}
                            <View style={[styles.paperPage, styles.leftPage, { borderRadius: pageBorderRadius, padding: contentPadding, zIndex: 5, position: 'absolute', left: 0, width: '50%', height: '100%' }]}>
                                {renderSpecificText(currentPage)}
                            </View>
                            <View style={[styles.paperPage, styles.rightPage, { borderRadius: pageBorderRadius, padding: contentPadding, zIndex: 5, position: 'absolute', right: 0, width: '50%', height: '100%' }]}>
                                {renderSpecificImage(currentPage)}
                            </View>

                            {/* LAYER 3: FLIPPING WIDGETS */}

                            {/* FLIP NEXT (Right Page flips to Left) */}
                            {/* Hinge is at the spine (Left of this widget) */}
                            <Animated.View style={[
                                styles.paperPage,
                                {
                                    borderTopLeftRadius: pageBorderRadius,
                                    borderBottomLeftRadius: pageBorderRadius,
                                    borderTopRightRadius: pageBorderRadius,
                                    borderBottomRightRadius: pageBorderRadius,
                                    padding: 0,
                                    position: 'absolute',
                                    right: 0,
                                    width: '50%',
                                    height: '100%',
                                    shadowColor: "#000",
                                    shadowOffset: { width: -5, height: 10 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 10,
                                    elevation: 10,
                                },
                                flipNextStyle
                            ]}>
                                {/* Front: Current Right Page (Image) */}
                                <Animated.View style={[{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', padding: contentPadding }, nextFrontFaceStyle]}>
                                    {renderSpecificImage(currentPage)}
                                </Animated.View>
                                {/* Back: Next Left Page (Text) */}
                                <Animated.View style={[{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', padding: contentPadding }, nextBackFaceStyle]}>
                                    {(() => {
                                        const nextIdx = currentPage + 1;
                                        return renderSpecificText(nextIdx);
                                    })()}
                                </Animated.View>
                            </Animated.View>

                            {/* FLIP PREV (Left Page flips to Right) */}
                            {/* Hinge is at the spine (Right of this widget) */}
                            <Animated.View style={[
                                styles.paperPage,
                                {
                                    borderTopLeftRadius: pageBorderRadius,
                                    borderBottomLeftRadius: pageBorderRadius,
                                    borderTopRightRadius: pageBorderRadius,
                                    borderBottomRightRadius: pageBorderRadius,
                                    padding: 0,
                                    position: 'absolute',
                                    left: 0,
                                    width: '50%',
                                    height: '100%',
                                    shadowColor: "#000",
                                    shadowOffset: { width: 5, height: 10 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 10,
                                    elevation: 10,
                                },
                                flipPrevStyle
                            ]}>
                                {/* Front: Current Left Page (Text) */}
                                <Animated.View style={[{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', padding: contentPadding }, prevFrontFaceStyle]}>
                                    {renderSpecificText(currentPage)}
                                </Animated.View>
                                {/* Back: Prev Right Page (Image) */}
                                <Animated.View style={[{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', padding: contentPadding }, prevBackFaceStyle]}>
                                    {(() => {
                                        const prevIdx = currentPage - 1;
                                        return renderSpecificImage(prevIdx);
                                    })()}
                                </Animated.View>
                            </Animated.View>
                        </View>
                    ) : (
                        // PORTRAIT: Stacked pages
                        <View style={styles.portraitStack}>
                            {/* Even pages: Image Top, Text Bottom */}
                            {/* Odd pages: Text Top, Image Bottom */}
                            {currentPage % 2 === 0 ? (
                                <>
                                    {/* Top page - Image */}
                                    <View
                                        style={[
                                            styles.paperPage,
                                            styles.topPage,
                                            { borderRadius: pageBorderRadius, padding: contentPadding },
                                        ]}
                                    >
                                        {renderImageContent()}
                                    </View>

                                    {/* Bottom page - Text */}
                                    <View
                                        style={[
                                            styles.paperPage,
                                            styles.bottomPage,
                                            {
                                                borderRadius: pageBorderRadius,
                                                padding: contentPadding + 8,
                                                overflow: "hidden",
                                            },
                                        ]}
                                    >
                                        {renderTextContent()}
                                    </View>
                                </>
                            ) : (
                                <>
                                    {/* SWAPPED LAYOUT */}
                                    {/* Top page - Text */}
                                    <View
                                        style={[
                                            styles.paperPage,
                                            styles.topPage,
                                            {
                                                borderRadius: pageBorderRadius,
                                                padding: contentPadding + 8,
                                                overflow: "hidden",
                                            },
                                        ]}
                                    >
                                        {renderTextContent()}
                                    </View>

                                    {/* Bottom page - Image */}
                                    <View
                                        style={[
                                            styles.paperPage,
                                            styles.bottomPage,
                                            { borderRadius: pageBorderRadius, padding: contentPadding },
                                        ]}
                                    >
                                        {renderImageContent()}
                                    </View>
                                </>
                            )}
                        </View>
                    )}
                </Animated.View>
            </GestureDetector>

            {/* Navigation Area */}
            <View style={styles.navigationArea}>
                {/* Navigation Dots */}
                <ScrollView
                    horizontal
                    style={styles.dotsScroll}
                    contentContainerStyle={styles.dotsContainer}
                    showsHorizontalScrollIndicator={false}
                >
                    {pages.slice(0, Math.min(pages.length, 20)).map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dot,
                                currentPage === index && styles.dotActive,
                            ]}
                            onPress={() => goToPage(index)}
                        />
                    ))}
                    {pages.length > 20 && (
                        <Text style={styles.moreDots}>+{pages.length - 20}</Text>
                    )}
                </ScrollView>

                {/* Navigation Buttons */}
                <View style={styles.buttonsRow}>
                    <TouchableOpacity
                        style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
                        onPress={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0 || isFlipping}
                    >
                        <Text style={styles.navButtonText}>{"\u25C0"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navButton, currentPage === totalPages - 1 && styles.navButtonDisabled]}
                        onPress={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages - 1 || isFlipping}
                    >
                        <Text style={styles.navButtonText}>{"\u25B6"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BOOK_COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: BOOK_COLORS.background,
    },

    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    backButton: {
        padding: 10,
    },
    backText: {
        color: BOOK_COLORS.textBrown,
        fontSize: 16,
        fontFamily: "ComicNeue_700Bold",
    },
    title: {
        color: BOOK_COLORS.textBrown,
        fontSize: 17,
        fontFamily: "ComicNeue_700Bold",
        flex: 1,
        textAlign: "center",
        marginHorizontal: 10,
    },
    pageNumber: {
        color: BOOK_COLORS.textSecondary,
        fontSize: 14,
        fontFamily: "ComicNeue_400Regular",
    },
    audiobookToggle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.2)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginRight: 8,
    },
    audiobookToggleActive: {
        backgroundColor: BOOK_COLORS.buttonBg || '#8B5E3C',
        borderColor: BOOK_COLORS.buttonBg || '#8B5E3C',
    },
    audiobookIcon: {
        fontSize: 20,
        lineHeight: 24,
    },

    // Book content area
    bookContent: {
        flex: 1,
        marginHorizontal: 12,
    },
    bookContentPortrait: {
        marginBottom: 4,
    },
    bookContentLandscape: {
        marginBottom: 4,
    },

    // Paper page base
    paperPage: {
        backgroundColor: BOOK_COLORS.pageCream,
        borderWidth: 0.5,
        borderColor: BOOK_COLORS.pageEdge,
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6,
    },

    // Portrait layout
    portraitStack: {
        flex: 1,
        gap: 10,
    },
    topPage: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    bottomPage: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    // Landscape layout
    landscapeSpread: {
        flex: 1,
        flexDirection: "row",
        gap: 0,
    },
    leftPage: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    rightPage: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
    },
    spine: {
        width: 6,
        backgroundColor: BOOK_COLORS.spine,
        borderRadius: 3,
        marginVertical: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },

    // Image
    imageFullPage: {
        width: "100%",
        height: "100%",
        borderRadius: 12,
    },
    imagePlaceholder: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: BOOK_COLORS.pageEdge,
        borderRadius: 12,
    },

    // Empty illustration placeholder
    emptyIllustration: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: BOOK_COLORS.pageEdge,
        borderRadius: 12,
    },
    emptyIllustrationInner: {
        width: "60%",
        height: "60%",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#E0D5C0",
        borderStyle: "dashed",
    },

    // Text content
    textPageContent: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 8,
    },
    storyText: {
        color: BOOK_COLORS.textBrown,
        textAlign: "center",
        fontFamily: "PatrickHand_400Regular",
    },
    pageOrnament: {
        color: BOOK_COLORS.spineLight,
        fontSize: 14,
        fontFamily: "ComicNeue_400Regular",
        textAlign: "center",
        marginTop: 8,
        marginBottom: 4,
    },

    // End action
    endActionContainer: {
        marginTop: 16,
        alignItems: "center",
        gap: 12,
    },
    endTitle: {
        color: BOOK_COLORS.textBrown,
        fontSize: 18,
        fontFamily: "ComicNeue_700Bold",
        opacity: 0.8,
    },
    libraryButton: {
        backgroundColor: BOOK_COLORS.buttonBg,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    libraryButtonText: {
        color: BOOK_COLORS.buttonText,
        fontSize: 17,
        fontFamily: "ComicNeue_700Bold",
    },
    actionButton: {
        backgroundColor: "transparent",
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 30,
        borderWidth: 1.5,
        borderColor: BOOK_COLORS.spine,
    },
    actionButtonText: {
        color: BOOK_COLORS.textSecondary,
        fontSize: 14,
        fontFamily: "ComicNeue_700Bold",
    },

    // Navigation area
    navigationArea: {
        paddingBottom: 24,
        paddingHorizontal: 16,
    },
    dotsScroll: {
        maxHeight: 30,
    },
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 20,
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: BOOK_COLORS.spineLight,
        opacity: 0.4,
    },
    dotActive: {
        width: 20,
        backgroundColor: BOOK_COLORS.spine,
        opacity: 1,
    },
    moreDots: {
        color: BOOK_COLORS.textSecondary,
        fontSize: 12,
        marginLeft: 8,
        fontFamily: "ComicNeue_400Regular",
    },

    // Navigation buttons
    buttonsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginTop: 4,
    },
    navButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: BOOK_COLORS.buttonBg,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    navButtonDisabled: {
        backgroundColor: BOOK_COLORS.spineLight,
        opacity: 0.4,
    },
    navButtonText: {
        color: BOOK_COLORS.buttonText,
        fontSize: 22,
    },
});
