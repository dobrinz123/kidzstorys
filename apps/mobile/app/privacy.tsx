import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useLanguageStore } from "../src/store/languageStore";

const TRANSLATIONS = {
    ro: {
        title: "Politica de Confidențialitate",
        back: "← Înapoi",
        lastUpdated: "Ultima actualizare: 25 Ianuarie 2026",
        gdprTitle: "Conformitate GDPR",
        sections: [
            {
                title: "1. Introducere",
                content: `Kids Stories ("noi", "al nostru") respectă confidențialitatea dvs. Această politică explică cum colectăm, folosim și protejăm datele personale în conformitate cu Regulamentul General privind Protecția Datelor (GDPR).`
            },
            {
                title: "2. Date Colectate",
                content: `Colectăm următoarele categorii de date:

• Informații de cont: email, nume (opțional)
• Date de utilizare: povești citite, progres lectura, liste favorite
• Date tehnice: tip dispozitiv, versiune OS, identificatori unici
• Date de plată: gestionate de App Store/Google Play, nu stocăm date bancare`
            },
            {
                title: "3. Scopul Prelucrării",
                content: `Folosim datele dvs. pentru:
• Furnizarea și îmbunătățirea serviciului
• Personalizarea experienței (recomandări povești)
• Salvarea progresului și preferințelor
• Procesarea abonamentelor
• Comunicări privind serviciul (actualizări, modificări)`
            },
            {
                title: "4. Temeiul Legal (GDPR)",
                content: `Prelucrăm datele în baza:
• Executarea contractului: furnizarea serviciului
• Consimțământ: pentru comunicări de marketing
• Interes legitim: îmbunătățirea serviciului, securitate`
            },
            {
                title: "5. Drepturile Dvs. (GDPR)",
                content: `Conform GDPR, aveți dreptul la:

✓ Acces: Solicitați o copie a datelor dvs.
✓ Rectificare: Corectați date inexacte
✓ Ștergere: Solicitați ștergerea datelor ("dreptul de a fi uitat")
✓ Restricționare: Limitați prelucrarea
✓ Portabilitate: Primiți datele într-un format standard
✓ Opoziție: Refuzați prelucrarea pentru marketing
✓ Retragerea consimțământului: Oricând, fără consecințe

Pentru a exercita aceste drepturi, contactați: privacy@kidsstories.app`
            },
            {
                title: "6. Protecția Copiilor",
                content: `Kids Stories este destinat copiilor, dar conturile sunt gestionate de adulți (18+). Nu colectăm intenționat date direct de la copii sub 13 ani. Părinții au control complet asupra datelor contului familiei.`
            },
            {
                title: "7. Stocarea și Securitatea",
                content: `• Datele sunt stocate pe servere securizate în UE
• Folosim criptare SSL/TLS pentru transmisii
• Accesul la date este restricționat personalului autorizat
• Păstrăm datele doar cât este necesar pentru scopuri`
            },
            {
                title: "8. Partajarea Datelor",
                content: `Nu vindem datele dvs. Partajăm date doar cu:
• Procesatori de plăți (Apple/Google) - pentru abonamente
• Furnizori de servicii tehnice - sub contracte stricte GDPR
• Autorități legale - când legea impune`
            },
            {
                title: "9. Cookie-uri și Tracking",
                content: `Aplicația folosește:
• Date locale: pentru salvarea preferințelor (limba, progres)
• Analytics minim: doar pentru funcționare și îmbunătățiri
• Nu folosim tracking publicitar sau cookies terțe`
            },
            {
                title: "10. Transfer Internațional",
                content: `Datele pot fi transferate în afara SEE doar către țări cu protecție adecvată sau pe baza clauzelor contractuale standard aprobate de UE.`
            },
            {
                title: "11. Modificări",
                content: `Vă vom notifica despre modificări semnificative ale acestei politici prin email sau în aplicație.`
            },
            {
                title: "12. Contact DPO",
                content: `Responsabil Protecția Datelor:
Email: dpo@kidsstories.app

Autoritatea de Supraveghere:
Puteți depune plângeri la autoritatea națională de protecție a datelor.`
            }
        ]
    },
    en: {
        title: "Privacy Policy",
        back: "← Back",
        lastUpdated: "Last updated: January 25, 2026",
        gdprTitle: "GDPR Compliance",
        sections: [
            {
                title: "1. Introduction",
                content: `Kids Stories ("we", "our") respects your privacy. This policy explains how we collect, use, and protect personal data in accordance with the General Data Protection Regulation (GDPR).`
            },
            {
                title: "2. Data Collected",
                content: `We collect the following categories of data:

• Account information: email, name (optional)
• Usage data: stories read, reading progress, favorite lists
• Technical data: device type, OS version, unique identifiers
• Payment data: handled by App Store/Google Play, we don't store banking data`
            },
            {
                title: "3. Purpose of Processing",
                content: `We use your data to:
• Provide and improve the service
• Personalize experience (story recommendations)
• Save progress and preferences
• Process subscriptions
• Service communications (updates, changes)`
            },
            {
                title: "4. Legal Basis (GDPR)",
                content: `We process data based on:
• Contract performance: providing the service
• Consent: for marketing communications
• Legitimate interest: service improvement, security`
            },
            {
                title: "5. Your Rights (GDPR)",
                content: `Under GDPR, you have the right to:

✓ Access: Request a copy of your data
✓ Rectification: Correct inaccurate data
✓ Erasure: Request data deletion ("right to be forgotten")
✓ Restriction: Limit processing
✓ Portability: Receive data in standard format
✓ Object: Refuse processing for marketing
✓ Withdraw consent: Anytime, without consequences

To exercise these rights, contact: privacy@kidsstories.app`
            },
            {
                title: "6. Children's Protection",
                content: `Kids Stories is designed for children, but accounts are managed by adults (18+). We do not intentionally collect data directly from children under 13. Parents have full control over family account data.`
            },
            {
                title: "7. Storage and Security",
                content: `• Data is stored on secure servers in the EU
• We use SSL/TLS encryption for transmissions
• Data access is restricted to authorized personnel
• We retain data only as long as necessary`
            },
            {
                title: "8. Data Sharing",
                content: `We do not sell your data. We share data only with:
• Payment processors (Apple/Google) - for subscriptions
• Technical service providers - under strict GDPR contracts
• Legal authorities - when required by law`
            },
            {
                title: "9. Cookies and Tracking",
                content: `The app uses:
• Local data: for saving preferences (language, progress)
• Minimal analytics: only for functionality and improvements
• No advertising tracking or third-party cookies`
            },
            {
                title: "10. International Transfer",
                content: `Data may be transferred outside the EEA only to countries with adequate protection or based on EU-approved standard contractual clauses.`
            },
            {
                title: "11. Changes",
                content: `We will notify you of significant changes to this policy via email or in-app.`
            },
            {
                title: "12. DPO Contact",
                content: `Data Protection Officer:
Email: dpo@kidsstories.app

Supervisory Authority:
You may file complaints with your national data protection authority.`
            }
        ]
    },
    it: {
        title: "Informativa sulla Privacy",
        back: "← Indietro",
        lastUpdated: "Ultimo aggiornamento: 25 Gennaio 2026",
        gdprTitle: "Conformità GDPR",
        sections: [
            {
                title: "1. Introduzione",
                content: `Kids Stories ("noi", "nostro") rispetta la tua privacy. Questa informativa spiega come raccogliamo, utilizziamo e proteggiamo i dati personali in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR).`
            },
            {
                title: "2. Dati Raccolti",
                content: `Raccogliamo le seguenti categorie di dati:

• Informazioni account: email, nome (opzionale)
• Dati di utilizzo: storie lette, progressi di lettura, liste preferiti
• Dati tecnici: tipo dispositivo, versione OS, identificatori unici
• Dati di pagamento: gestiti da App Store/Google Play, non memorizziamo dati bancari`
            },
            {
                title: "3. Scopo del Trattamento",
                content: `Utilizziamo i tuoi dati per:
• Fornire e migliorare il servizio
• Personalizzare l'esperienza (raccomandazioni storie)
• Salvare progressi e preferenze
• Elaborare abbonamenti
• Comunicazioni sul servizio (aggiornamenti, modifiche)`
            },
            {
                title: "4. Base Giuridica (GDPR)",
                content: `Trattiamo i dati sulla base di:
• Esecuzione del contratto: fornitura del servizio
• Consenso: per comunicazioni di marketing
• Interesse legittimo: miglioramento del servizio, sicurezza`
            },
            {
                title: "5. I Tuoi Diritti (GDPR)",
                content: `In base al GDPR, hai diritto a:

✓ Accesso: Richiedere una copia dei tuoi dati
✓ Rettifica: Correggere dati inesatti
✓ Cancellazione: Richiedere l'eliminazione dei dati ("diritto all'oblio")
✓ Limitazione: Limitare il trattamento
✓ Portabilità: Ricevere i dati in formato standard
✓ Opposizione: Rifiutare il trattamento per marketing
✓ Revoca del consenso: In qualsiasi momento, senza conseguenze

Per esercitare questi diritti, contatta: privacy@kidsstories.app`
            },
            {
                title: "6. Protezione dei Minori",
                content: `Kids Stories è progettato per i bambini, ma gli account sono gestiti da adulti (18+). Non raccogliamo intenzionalmente dati direttamente da bambini sotto i 13 anni. I genitori hanno il pieno controllo sui dati dell'account familiare.`
            },
            {
                title: "7. Archiviazione e Sicurezza",
                content: `• I dati sono archiviati su server sicuri nell'UE
• Utilizziamo crittografia SSL/TLS per le trasmissioni
• L'accesso ai dati è limitato al personale autorizzato
• Conserviamo i dati solo per il tempo necessario`
            },
            {
                title: "8. Condivisione dei Dati",
                content: `Non vendiamo i tuoi dati. Condividiamo dati solo con:
• Processori di pagamento (Apple/Google) - per abbonamenti
• Fornitori di servizi tecnici - con contratti GDPR rigorosi
• Autorità legali - quando richiesto dalla legge`
            },
            {
                title: "9. Cookie e Tracking",
                content: `L'app utilizza:
• Dati locali: per salvare preferenze (lingua, progressi)
• Analytics minimo: solo per funzionalità e miglioramenti
• Nessun tracking pubblicitario o cookie di terze parti`
            },
            {
                title: "10. Trasferimento Internazionale",
                content: `I dati possono essere trasferiti al di fuori del SEE solo verso paesi con protezione adeguata o sulla base di clausole contrattuali standard approvate dall'UE.`
            },
            {
                title: "11. Modifiche",
                content: `Ti informeremo di modifiche significative a questa informativa tramite email o in-app.`
            },
            {
                title: "12. Contatto DPO",
                content: `Responsabile della Protezione dei Dati:
Email: dpo@kidsstories.app

Autorità di Controllo:
Puoi presentare reclami all'autorità nazionale per la protezione dei dati.`
            }
        ]
    }
};

export default function PrivacyScreen() {
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
                <View style={styles.gdprBadge}>
                    <Text style={styles.gdprBadgeText}>🛡️ {t.gdprTitle}</Text>
                </View>
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
        marginBottom: 12,
    },
    gdprBadge: {
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: "flex-start",
        marginBottom: 12,
    },
    gdprBadgeText: {
        color: "#22c55e",
        fontSize: 13,
        fontWeight: "600",
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
