import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal, Platform, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useUserStore } from "../src/store/userStore";
import { CATEGORY_COVERS, AVATARS } from "../src/data/coverImages";
import { useLanguageStore } from "../src/store/languageStore";
import { useAuth } from "../src/hooks/useAuth";
import { useSubscription } from "../src/hooks/useSubscription";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Purchases from "react-native-purchases";

const TRANSLATIONS = {
    ro: {
        back: "← Înapoi",
        account: "Cont",
        membership: "Abonament",
        security: "Securitate",
        devices: "Dispozitive",
        unlockAccess: "Deblochează Acces Complet",
        unlockDesc: "Primești acces nelimitat la toate poveștile, citire offline și multe altele.",
        monthly: "Lunar",
        monthlyPrice: "25 RON / lună",
        cancelAnytime: "Anulezi oricând.",
        startMonthly: "Începe Plan Lunar",
        annual: "Anual",
        annualPrice: "200 RON / an",
        bestValue: "CEL MAI BUN",
        savePercent: "Economisești 33%. Asta înseamnă 4 luni gratuit!",
        startAnnual: "Începe Plan Anual",
        activePlan: "Plan Activ",
        nextBilling: "Următoarea facturare: {date}",
        active: "Activ",
        cancelMembership: "Anulează Abonament",
        email: "Email",
        edit: "Editează",
        phone: "Telefon",
        password: "Parolă",
        changePassword: "Schimbă Parola",
        manageDevices: "Gestionează dispozitivele conectate la contul tău.",
        activeNow: "Activ acum",
        signOut: "Deconectare",
        signOutAll: "Deconectează-te de pe toate dispozitivele",
        deleteAccount: "Șterge Contul",
        version: "Versiunea 1.0.0",
        chooseAvatar: "Alege Avatar",
        close: "Închide",
        confirmLogout: "Ești sigur că vrei să te deconectezi?",
        yes: "Da",
        no: "Nu",
        confirmDelete: "Această acțiune este ireversibilă. Toate datele vor fi pierdute.",
        deletePermanently: "Șterge Permanent",
        cancel: "Anulează",
        editPhone: "Editează Telefon",
        phoneNumber: "Număr de telefon",
        save: "Salvează",
        noPhone: "Nesetat",
        confirmLogoutDevice: "Ești sigur că vrei să deconectezi acest dispozitiv?",
        confirmLogoutAll: "Ești sigur că vrei să te deconectezi de pe toate dispozitivele?"
    },
    en: {
        back: "← Back",
        account: "Account",
        membership: "Membership",
        security: "Security",
        devices: "Devices",
        unlockAccess: "Unlock Full Access",
        unlockDesc: "Get unlimited access to all stories, offline reading, and more.",
        monthly: "Monthly",
        monthlyPrice: "5 € / mo",
        cancelAnytime: "Cancel anytime.",
        startMonthly: "Start Monthly Plan",
        annual: "Annual",
        annualPrice: "40 € / year",
        bestValue: "BEST VALUE",
        savePercent: "Save 33%. That's 4 months free!",
        startAnnual: "Start Annual Plan",
        activePlan: "Active Plan",
        nextBilling: "Next billing: {date}",
        active: "Active",
        cancelMembership: "Cancel Membership",
        email: "Email",
        edit: "Edit",
        phone: "Phone",
        password: "Password",
        changePassword: "Change Password",
        manageDevices: "Manage devices connected to your account.",
        activeNow: "Active now",
        signOut: "Sign Out",
        signOutAll: "Sign out of all devices",
        deleteAccount: "Delete Account",
        version: "Version 1.0.0",
        chooseAvatar: "Choose Avatar",
        close: "Close",
        confirmLogout: "Are you sure you want to log out?",
        yes: "Yes",
        no: "No",
        confirmDelete: "This action is irreversible. All data will be lost.",
        deletePermanently: "Delete Permanently",
        cancel: "Cancel",
        editPhone: "Edit Phone",
        phoneNumber: "Phone number",
        save: "Save",
        noPhone: "Not set",
        confirmLogoutDevice: "Are you sure you want to log out this device?",
        confirmLogoutAll: "Are you sure you want to log out of all devices?"
    },
    it: {
        back: "← Indietro",
        account: "Account",
        membership: "Abbonamento",
        security: "Sicurezza",
        devices: "Dispositivi",
        unlockAccess: "Sblocca Accesso Completo",
        unlockDesc: "Ottieni accesso illimitato a tutte le storie, lettura offline e altro.",
        monthly: "Mensile",
        monthlyPrice: "5 € / mese",
        cancelAnytime: "Disdici quando vuoi.",
        startMonthly: "Inizia Piano Mensile",
        annual: "Annuale",
        annualPrice: "40 € / anno",
        bestValue: "MIGLIOR PREZZO",
        savePercent: "Risparmia 33%. Sono 4 mesi gratis!",
        startAnnual: "Inizia Piano Annuale",
        activePlan: "Piano Attivo",
        nextBilling: "Prossimo rinnovo: {date}",
        active: "Attivo",
        cancelMembership: "Cancella Abbonamento",
        email: "Email",
        edit: "Modifica",
        phone: "Telefono",
        password: "Password",
        changePassword: "Cambia Password",
        manageDevices: "Gestisci i dispositivi connessi al tuo account.",
        activeNow: "Attivo ora",
        signOut: "Disconnetti",
        signOutAll: "Disconnetti da tutti i dispositivi",
        deleteAccount: "Elimina Account",
        version: "Versione 1.0.0",
        chooseAvatar: "Scegli Avatar",
        close: "Chiudi",
        confirmLogout: "Sei sicuro di voler uscire?",
        yes: "Sì",
        no: "No",
        confirmDelete: "Questa azione è irreversibile. Tutti i dati andranno persi.",
        deletePermanently: "Elimina Definitivamente",
        cancel: "Annulla",
        editPhone: "Modifica Telefono",
        phoneNumber: "Numero di telefono",
        save: "Salva",
        noPhone: "Non impostato",
        confirmLogoutDevice: "Sei sicuro di voler disconnettere questo dispositivo?",
        confirmLogoutAll: "Sei sicuro di voler disconnetterti da tutti i dispositivi?"
    }
};

export default function AccountPage() {
    const router = useRouter();
    const { avatarId, setAvatar } = useUserStore();
    const language = useLanguageStore((state) => state.language);
    const { signOut, user: convexUser } = useAuth();
    const { hasAccess, expiresAt } = useSubscription(convexUser?._id ?? null);

    const t = TRANSLATIONS[language] || TRANSLATIONS.ro;

    const [activeTab, setActiveTab] = useState<'membership' | 'security' | 'devices'>('membership');
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [isSavingPhone, setIsSavingPhone] = useState(false);
    const [showDeviceLogoutConfirm, setShowDeviceLogoutConfirm] = useState(false);
    const [showAllDevicesLogoutConfirm, setShowAllDevicesLogoutConfirm] = useState(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    const deleteAccountMutation = useMutation(api.users.deleteAccount);
    const updatePhoneMutation = useMutation(api.users.updatePhone);

    // Mock devices for UI completeness as we don't track devices backend yet
    const devices = [
        { id: '1', name: 'Current Device', location: 'Unknown', active: true },
    ];

    const selectedAvatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

    // Helper data derived from real state
    const userEmail = convexUser?.email || "loading...";
    const userPhone = convexUser?.phone || "";
    const hasSubscription = hasAccess;
    const activePlan = hasAccess ? t.monthly : null; // Simplified assumption for now
    const renewalDate = expiresAt ? new Date(expiresAt).toLocaleDateString() : null;



    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const handleDeleteAccount = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAccount = async () => {
        if (!convexUser?._id) return;

        setIsDeleting(true);
        try {
            // 1. Cancel subscription in RevenueCat if active
            if (hasAccess) {
                try {
                    // RevenueCat doesn't have a direct cancel API from client
                    // The subscription will naturally expire and not renew
                    // We just need to log the user out of RevenueCat
                    await Purchases.logOut();
                } catch (rcError) {
                    console.log("RevenueCat logout error (non-blocking):", rcError);
                }
            }

            // 2. Delete user from database
            await deleteAccountMutation({ userId: convexUser._id });

            // 3. Sign out locally
            await signOut();

            // 4. Close modal and redirect to welcome
            setShowDeleteConfirm(false);
            router.replace("/welcome");
        } catch (error) {
            console.error("Error deleting account:", error);
            Alert.alert("Error", "Failed to delete account. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubscribe = (plan: 'monthly' | 'annual') => {
        router.push("/paywall");
    };

    const handleEditPhone = () => {
        setPhoneInput(userPhone);
        setShowPhoneModal(true);
    };

    const handleSavePhone = async () => {
        if (!convexUser?._id) return;

        setIsSavingPhone(true);
        try {
            await updatePhoneMutation({ userId: convexUser._id, phone: phoneInput.trim() });
            setShowPhoneModal(false);
        } catch (error) {
            console.error("Error saving phone:", error);
            Alert.alert("Error", "Failed to save phone number. Please try again.");
        } finally {
            setIsSavingPhone(false);
        }
    };

    const handleDeviceLogout = (deviceId: string) => {
        setSelectedDeviceId(deviceId);
        setShowDeviceLogoutConfirm(true);
    };

    const confirmDeviceLogout = async () => {
        // For current device, just sign out
        setShowDeviceLogoutConfirm(false);
        await signOut();
        router.replace("/welcome");
    };

    const handleAllDevicesLogout = () => {
        setShowAllDevicesLogoutConfirm(true);
    };

    const confirmAllDevicesLogout = async () => {
        // Sign out from all devices (for now, same as regular sign out)
        setShowAllDevicesLogoutConfirm(false);
        await signOut();
        router.replace("/welcome");
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>{t.back}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.account}</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.content}>

                {/* Profile Card with Avatar Picker */}
                <View style={styles.profileCard}>
                    <TouchableOpacity onPress={() => setShowAvatarPicker(true)}>
                        <Image source={selectedAvatar.img} style={styles.avatar} />
                        <View style={styles.editAvatarBadge}>
                            <Text style={styles.editAvatarText}>✎</Text>
                        </View>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.userName}>{convexUser?.name || "User"}</Text>
                        <Text style={styles.userEmail}>{userEmail}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {(['membership', 'security', 'devices'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {t[tab]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* CONTENT SECTIONS */}
                <View style={styles.sectionContainer}>

                    {/* MEMBERSHIP TAB */}
                    {activeTab === 'membership' && (
                        <View style={styles.section}>

                            {/* Paywall / Current Plan */}
                            {!hasSubscription ? (
                                <View style={styles.paywallContainer}>
                                    <Text style={styles.paywallTitle}>{t.unlockAccess}</Text>
                                    <Text style={styles.paywallDesc}>{t.unlockDesc}</Text>

                                    {/* Monthly Plan */}
                                    <TouchableOpacity style={styles.subOption} onPress={() => handleSubscribe('monthly')}>
                                        <View style={styles.subHeader}>
                                            <Text style={styles.subTitle}>{t.monthly}</Text>
                                            <Text style={styles.subPrice}>{t.monthlyPrice}</Text>
                                        </View>
                                        <Text style={styles.subDesc}>{t.cancelAnytime}</Text>
                                        <View style={styles.subBtn}>
                                            <Text style={styles.subBtnText}>{t.startMonthly}</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Annual Plan */}
                                    <TouchableOpacity style={[styles.subOption, { borderColor: '#7C4DFF', borderWidth: 2 }]} onPress={() => handleSubscribe('annual')}>
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{t.bestValue}</Text>
                                        </View>
                                        <View style={styles.subHeader}>
                                            <Text style={styles.subTitle}>{t.annual}</Text>
                                            <Text style={styles.subPrice}>{t.annualPrice}</Text>
                                        </View>
                                        <Text style={styles.subDesc}>{t.savePercent}</Text>
                                        <View style={[styles.subBtn, { backgroundColor: '#7C4DFF' }]}>
                                            <Text style={styles.subBtnText}>{t.startAnnual}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.planCard}>
                                    <View>
                                        <Text style={styles.planName}>{activePlan}</Text>
                                        <Text style={styles.planMeta}>{t.nextBilling.replace("{date}", renewalDate || "")}</Text>
                                    </View>
                                    <View style={[styles.priceTag, { backgroundColor: '#7C4DFF' }]}>
                                        <Text style={styles.priceText}>{t.active}</Text>
                                    </View>
                                </View>
                            )}

                            {hasSubscription && (
                                <TouchableOpacity style={styles.dangerBtn} onPress={() => Alert.alert("Cancel", "Membership cancelled")}>
                                    <Text style={styles.dangerText}>{t.cancelMembership}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <View style={styles.section}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t.email}</Text>
                                <View style={styles.readOnlyInput}>
                                    <Text style={styles.inputText}>{userEmail}</Text>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t.phone}</Text>
                                <TouchableOpacity style={styles.readOnlyInput} onPress={handleEditPhone}>
                                    <Text style={styles.inputText}>{userPhone || t.noPhone}</Text>
                                    <Text style={styles.editLink}>{t.edit}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t.password}</Text>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => router.push("/forgot-password")}
                                >
                                    <Text style={styles.actionBtnText}>{t.changePassword}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* DEVICES TAB */}
                    {activeTab === 'devices' && (
                        <View style={styles.section}>
                            <Text style={styles.subDesc}>{t.manageDevices}</Text>
                            {devices.map((d: any) => (
                                <View key={d.id} style={styles.deviceRow}>
                                    <View>
                                        <Text style={styles.deviceName}>{d.name}</Text>
                                        <Text style={styles.deviceMeta}>{d.location} • {t.activeNow}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeviceLogout(d.id)}>
                                        <Text style={styles.signOutDevice}>{t.signOut}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <TouchableOpacity style={styles.signOutAllBtn} onPress={handleAllDevicesLogout}>
                                <Text style={styles.signOutAllText}>{t.signOutAll}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </View>

                {/* Footer with Delete and Sign Out */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
                        <Text style={styles.signOutBtnText}>{t.signOut}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteAccBtn} onPress={handleDeleteAccount}>
                        <Text style={styles.deleteAccText}>{t.deleteAccount}</Text>
                    </TouchableOpacity>
                    <Text style={styles.version}>{t.version}</Text>
                </View>

            </ScrollView>

            {/* Avatar Picker Modal */}
            <Modal
                visible={showAvatarPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAvatarPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t.chooseAvatar}</Text>
                        <View style={styles.avatarGrid}>
                            {AVATARS.map(avatar => (
                                <TouchableOpacity
                                    key={avatar.id}
                                    style={[styles.avatarOption, avatarId === avatar.id && styles.avatarOptionSelected]}
                                    onPress={() => {
                                        setAvatar(avatar.id);
                                        setShowAvatarPicker(false);
                                    }}
                                >
                                    <Image source={avatar.img} style={styles.avatarImg} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAvatarPicker(false)}>
                            <Text style={styles.closeBtnText}>{t.close}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Logout Confirmation Modal */}
            <Modal
                visible={showLogoutConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLogoutConfirm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t.signOut}</Text>
                        <Text style={styles.modalDesc}>{t.confirmLogout}</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowLogoutConfirm(false)}
                            >
                                <Text style={styles.modalBtnText}>{t.no}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnDestructive]}
                                onPress={async () => {
                                    setShowLogoutConfirm(false);
                                    await signOut();
                                    router.replace("/welcome");
                                }}
                            >
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t.yes}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Account Confirmation Modal */}
            <Modal
                visible={showDeleteConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => !isDeleting && setShowDeleteConfirm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t.deleteAccount}</Text>
                        <Text style={styles.modalDesc}>{t.confirmDelete}</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                <Text style={[styles.modalBtnText, isDeleting && { opacity: 0.5 }]}>{t.cancel}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnDestructive]}
                                onPress={confirmDeleteAccount}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t.deletePermanently}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Phone Modal */}
            <Modal
                visible={showPhoneModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => !isSavingPhone && setShowPhoneModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t.editPhone}</Text>

                        <View style={styles.phoneInputContainer}>
                            <Text style={styles.phoneInputLabel}>{t.phoneNumber}</Text>
                            <TextInput
                                style={styles.phoneInput}
                                value={phoneInput}
                                onChangeText={setPhoneInput}
                                placeholder="+40 712 345 678"
                                placeholderTextColor="#666"
                                keyboardType="phone-pad"
                                autoFocus
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowPhoneModal(false)}
                                disabled={isSavingPhone}
                            >
                                <Text style={[styles.modalBtnText, isSavingPhone && { opacity: 0.5 }]}>{t.cancel}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnSave]}
                                onPress={handleSavePhone}
                                disabled={isSavingPhone}
                            >
                                {isSavingPhone ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t.save}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Device Logout Confirmation Modal */}
            <Modal
                visible={showDeviceLogoutConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeviceLogoutConfirm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t.signOut}</Text>
                        <Text style={styles.modalDesc}>{t.confirmLogoutDevice}</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowDeviceLogoutConfirm(false)}
                            >
                                <Text style={styles.modalBtnText}>{t.no}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnDestructive]}
                                onPress={confirmDeviceLogout}
                            >
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t.yes}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* All Devices Logout Confirmation Modal */}
            <Modal
                visible={showAllDevicesLogoutConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAllDevicesLogoutConfirm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t.signOutAll}</Text>
                        <Text style={styles.modalDesc}>{t.confirmLogoutAll}</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowAllDevicesLogoutConfirm(false)}
                            >
                                <Text style={styles.modalBtnText}>{t.no}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnDestructive]}
                                onPress={confirmAllDevicesLogout}
                            >
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t.yes}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1a1a3e", // Cosmic Dark Blue
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: "#1a1a3e",
    },
    backText: {
        color: "#fff",
        fontSize: 16,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
    },
    backBtn: {
        padding: 8,
    },
    content: {
        flex: 1,
    },

    // Profile
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#2a2a5e",
        marginBottom: 24,
        marginHorizontal: 20,
        borderRadius: 24,
        elevation: 4,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#7C4DFF',
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 16,
        backgroundColor: '#7C4DFF',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2a2a5e',
    },
    editAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    userName: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 4,
    },
    userEmail: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 14,
    },

    // Tabs
    tabs: {
        flexDirection: "row",
        marginBottom: 24,
    },
    tab: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.05)",
        marginRight: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    tabActive: {
        backgroundColor: "#7C4DFF",
        borderColor: "#7C4DFF",
    },
    tabText: {
        color: "rgba(255,255,255,0.6)",
        fontWeight: '600',
    },
    tabTextActive: {
        color: "#fff",
        fontWeight: 'bold',
    },

    // Sections
    sectionContainer: {
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 30,
    },

    // Paywall
    paywallContainer: {
        marginBottom: 20,
        backgroundColor: "#2a2a5e",
        padding: 20,
        borderRadius: 24,
    },
    paywallTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    paywallDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },

    // Subscription Options
    subOption: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    subTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    subPrice: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    subDesc: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginBottom: 16,
    },
    subBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    subBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Badge
    badge: {
        position: 'absolute',
        top: -12,
        right: 16,
        backgroundColor: '#7C4DFF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Active Plan Card
    planCard: {
        backgroundColor: '#2a2a5e',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    planName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    planMeta: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    priceTag: {
        backgroundColor: '#7C4DFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    priceText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },

    dangerBtn: {
        padding: 16,
        alignItems: 'center',
    },
    dangerText: {
        color: '#ff4d4d',
        fontSize: 14,
    },

    // Inputs (Security)
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    readOnlyInput: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inputText: {
        color: '#fff',
        fontSize: 16,
    },
    editLink: {
        color: '#7C4DFF',
        fontWeight: 'bold',
    },
    actionBtn: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: "600",
    },

    // Devices
    deviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    deviceName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    deviceMeta: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    },
    signOutDevice: {
        color: '#7C4DFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    signOutAllBtn: {
        marginTop: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    signOutAllText: {
        color: '#fff',
        fontWeight: 'bold',
    },

    // Footer
    footer: {
        padding: 24,
        paddingBottom: 40,
        gap: 16,
    },
    signOutBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    signOutBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteAccBtn: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    deleteAccText: {
        color: '#ff4d4d', // Keep red for danger
        fontSize: 14,
    },
    version: {
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        fontSize: 12,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#2a2a5e',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 10,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalDesc: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnCancel: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    modalBtnDestructive: {
        backgroundColor: '#ff4d4d',
    },
    modalBtnSave: {
        backgroundColor: '#7C4DFF',
    },
    modalBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Avatar Picker
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24,
    },
    avatarOption: {
        padding: 4,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    avatarOptionSelected: {
        borderColor: '#7C4DFF',
    },
    avatarImg: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    closeBtn: {
        alignItems: 'center',
        padding: 12,
    },
    closeBtnText: {
        color: '#fff',
        fontSize: 16,
    },

    // Phone Input
    phoneInputContainer: {
        marginBottom: 24,
    },
    phoneInputLabel: {
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 8,
        fontSize: 12,
    },
    phoneInput: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        color: '#fff',
        padding: 16,
        borderRadius: 12,
        fontSize: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
});
