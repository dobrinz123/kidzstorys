import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useLanguageStore } from "../src/store/languageStore";

const TRANSLATIONS = {
    ro: {
        title: "Termeni și Condiții",
        back: "← Înapoi",
        lastUpdated: "Ultima actualizare: 25 Ianuarie 2026",
        sections: [
            {
                title: "1. Acceptarea Termenilor",
                content: `Prin descărcarea, instalarea sau utilizarea aplicației Kids Stories ("Aplicația"), acceptați să fiți obligat de acești Termeni și Condiții. Dacă nu sunteți de acord cu acești termeni, vă rugăm să nu utilizați Aplicația.`
            },
            {
                title: "2. Descrierea Serviciului",
                content: `Kids Stories oferă o platformă de povești interactive pentru copii, disponibilă în mai multe limbi (română, engleză, italiană). Serviciul include:
• Acces la biblioteca de povești
• Funcții de salvare a progresului lecturii
• Liste de favorite personalizate
• Conținut nou adăugat periodic`
            },
            {
                title: "3. Abonamente și Plăți",
                content: `• Plățile sunt procesate prin App Store (iOS) sau Google Play (Android)
• Abonamentele se reînnoiesc automat la sfârșitul perioadei
• Puteți anula abonamentul oricând din setările contului
• Rambursările sunt gestionate conform politicilor Apple/Google
• Prețurile pot varia în funcție de regiunea dvs.`
            },
            {
                title: "4. Conturi și Securitate",
                content: `• Sunteți responsabil pentru păstrarea confidențialității contului dvs.
• Trebuie să aveți cel puțin 18 ani pentru a crea un cont
• Copiii trebuie supravegheați de un adult la utilizare
• Nu împărtășiți datele de autentificare cu terți`
            },
            {
                title: "5. Utilizare Acceptabilă",
                content: `Nu aveți voie să:
• Copiați, modificați sau distribuiți conținutul aplicației
• Utilizați aplicația în scopuri comerciale neautorizate
• Încercați să accesați sisteme neautorizate
• Partajați contul cu persoane din afara familiei`
            },
            {
                title: "6. Proprietate Intelectuală",
                content: `Tot conținutul din Kids Stories, inclusiv poveștile, ilustrațiile și design-ul, este protejat de drepturi de autor. Toate drepturile sunt rezervate.`
            },
            {
                title: "7. Limitarea Răspunderii",
                content: `Kids Stories este furnizat "așa cum este". Nu garantăm că serviciul va fi neîntrerupt sau fără erori. Nu suntem răspunzători pentru daune indirecte rezultate din utilizarea aplicației.`
            },
            {
                title: "8. Modificări ale Termenilor",
                content: `Ne rezervăm dreptul de a modifica acești termeni. Veți fi notificat despre schimbări semnificative prin aplicație sau email.`
            },
            {
                title: "9. Contact",
                content: `Pentru întrebări despre acești termeni, contactați-ne la: support@kidsstories.app`
            }
        ]
    },
    en: {
        title: "Terms & Conditions",
        back: "← Back",
        lastUpdated: "Last updated: January 25, 2026",
        sections: [
            {
                title: "1. Acceptance of Terms",
                content: `By downloading, installing, or using the Kids Stories app ("App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.`
            },
            {
                title: "2. Service Description",
                content: `Kids Stories provides an interactive story platform for children, available in multiple languages (Romanian, English, Italian). The service includes:
• Access to the story library
• Reading progress saving features
• Personalized favorite lists
• Periodically added new content`
            },
            {
                title: "3. Subscriptions and Payments",
                content: `• Payments are processed through the App Store (iOS) or Google Play (Android)
• Subscriptions auto-renew at the end of each period
• You can cancel your subscription anytime from account settings
• Refunds are handled according to Apple/Google policies
• Prices may vary depending on your region`
            },
            {
                title: "4. Accounts and Security",
                content: `• You are responsible for maintaining the confidentiality of your account
• You must be at least 18 years old to create an account
• Children should be supervised by an adult during use
• Do not share login credentials with third parties`
            },
            {
                title: "5. Acceptable Use",
                content: `You may not:
• Copy, modify, or distribute app content
• Use the app for unauthorized commercial purposes
• Attempt to access unauthorized systems
• Share your account with people outside your family`
            },
            {
                title: "6. Intellectual Property",
                content: `All content in Kids Stories, including stories, illustrations, and design, is protected by copyright. All rights reserved.`
            },
            {
                title: "7. Limitation of Liability",
                content: `Kids Stories is provided "as is". We do not guarantee that the service will be uninterrupted or error-free. We are not liable for indirect damages resulting from app use.`
            },
            {
                title: "8. Changes to Terms",
                content: `We reserve the right to modify these terms. You will be notified of significant changes through the app or email.`
            },
            {
                title: "9. Contact",
                content: `For questions about these terms, contact us at: support@kidsstories.app`
            }
        ]
    },
    it: {
        title: "Termini e Condizioni",
        back: "← Indietro",
        lastUpdated: "Ultimo aggiornamento: 25 Gennaio 2026",
        sections: [
            {
                title: "1. Accettazione dei Termini",
                content: `Scaricando, installando o utilizzando l'app Kids Stories ("App"), accetti di essere vincolato da questi Termini e Condizioni. Se non accetti questi termini, ti preghiamo di non utilizzare l'App.`
            },
            {
                title: "2. Descrizione del Servizio",
                content: `Kids Stories fornisce una piattaforma di storie interattive per bambini, disponibile in più lingue (rumeno, inglese, italiano). Il servizio include:
• Accesso alla libreria di storie
• Funzioni di salvataggio dei progressi di lettura
• Liste preferiti personalizzate
• Nuovi contenuti aggiunti periodicamente`
            },
            {
                title: "3. Abbonamenti e Pagamenti",
                content: `• I pagamenti vengono elaborati tramite App Store (iOS) o Google Play (Android)
• Gli abbonamenti si rinnovano automaticamente alla fine del periodo
• Puoi annullare l'abbonamento in qualsiasi momento dalle impostazioni
• I rimborsi sono gestiti secondo le politiche di Apple/Google
• I prezzi possono variare a seconda della tua regione`
            },
            {
                title: "4. Account e Sicurezza",
                content: `• Sei responsabile della riservatezza del tuo account
• Devi avere almeno 18 anni per creare un account
• I bambini devono essere supervisionati da un adulto durante l'uso
• Non condividere le credenziali di accesso con terzi`
            },
            {
                title: "5. Uso Accettabile",
                content: `Non puoi:
• Copiare, modificare o distribuire il contenuto dell'app
• Utilizzare l'app per scopi commerciali non autorizzati
• Tentare di accedere a sistemi non autorizzati
• Condividere il tuo account con persone al di fuori della tua famiglia`
            },
            {
                title: "6. Proprietà Intellettuale",
                content: `Tutti i contenuti di Kids Stories, incluse storie, illustrazioni e design, sono protetti da copyright. Tutti i diritti riservati.`
            },
            {
                title: "7. Limitazione di Responsabilità",
                content: `Kids Stories è fornito "così com'è". Non garantiamo che il servizio sarà ininterrotto o privo di errori. Non siamo responsabili per danni indiretti derivanti dall'uso dell'app.`
            },
            {
                title: "8. Modifiche ai Termini",
                content: `Ci riserviamo il diritto di modificare questi termini. Sarai avvisato di cambiamenti significativi tramite l'app o email.`
            },
            {
                title: "9. Contatto",
                content: `Per domande su questi termini, contattaci a: support@kidsstories.app`
            }
        ]
    }
};

export default function TermsScreen() {
    const router = useRouter();
    const language = useLanguageStore((state) => state.language);
    const t = TRANSLATIONS[language] || TRANSLATIONS.ro;

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>{t.back}</Text>
                </TouchableOpacity>

                <Text style={styles.title}>{t.title}</Text>
                <Text style={styles.lastUpdated}>{t.lastUpdated}</Text>

                {/* Sections */}
                {t.sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionContent}>{section.content}</Text>
                    </View>
                ))}

                <View style={styles.footer} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#141414",
    },
    scrollView: {
        flex: 1,
        padding: 24,
        paddingTop: 50,
    },
    backButton: {
        marginBottom: 20,
    },
    backText: {
        color: "#fff",
        fontSize: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 8,
    },
    lastUpdated: {
        fontSize: 14,
        color: "rgba(255,255,255,0.5)",
        marginBottom: 32,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 12,
    },
    sectionContent: {
        fontSize: 15,
        color: "rgba(255,255,255,0.8)",
        lineHeight: 24,
    },
    footer: {
        height: 40,
    },
});
