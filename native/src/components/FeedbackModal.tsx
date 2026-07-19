import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, fonts, radius } from "../theme/tokens";

const FORMSPREE_ID = "xdajvagj";

type Status = "idle" | "submitting" | "success" | "error";

const TYPE_OPTIONS = [
  { value: "feedback", label: "Feedback" },
  { value: "spot", label: "Suggest a spot" },
  { value: "issue", label: "Report issue" },
];

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit() {
    if (!message.trim() || status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type, message, email: email || undefined, platform: "ios-app" }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  const placeholder =
    type === "spot"
      ? "Which spot should we add? Where do you launch?"
      : type === "issue"
        ? "What's wrong, and on which spot?"
        : "What's working? What's missing?";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.avoider}
        >
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Feedback</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            {status === "success" ? (
              <View style={{ paddingVertical: 16 }}>
                <Text style={styles.successText}>Thanks, got it. We read everything.</Text>
                <Pressable onPress={onClose} style={styles.submitButton}>
                  <Text style={styles.submitText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.label}>WHAT&rsquo;S THIS ABOUT?</Text>
                <View style={styles.typeRow}>
                  {TYPE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setType(opt.value)}
                      style={[styles.typePill, type === opt.value && styles.typePillActive]}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          type === opt.value && styles.typePillTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  placeholder={placeholder}
                  placeholderTextColor={colors.inkFaint}
                  style={styles.messageInput}
                />

                <Text style={styles.label}>
                  YOUR EMAIL <Text style={styles.labelSoft}>(optional, for replies)</Text>
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.inkFaint}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.emailInput}
                />

                {status === "error" && (
                  <Text style={styles.errorText}>
                    Couldn&rsquo;t send. Check your connection and try again.
                  </Text>
                )}

                <Pressable
                  onPress={handleSubmit}
                  disabled={!message.trim() || status === "submitting"}
                  style={[
                    styles.submitButton,
                    (!message.trim() || status === "submitting") && { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.submitText}>
                    {status === "submitting" ? "Sending…" : "Send"}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  avoider: {
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.displaySemibold,
    fontSize: 20,
    color: colors.dark,
  },
  close: {
    fontSize: 24,
    color: colors.inkMuted,
    lineHeight: 26,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.muted,
    marginBottom: 6,
  },
  labelSoft: {
    fontFamily: fonts.body,
    color: colors.inkFaint,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typePillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typePillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.dark,
  },
  typePillTextActive: {
    color: colors.white,
  },
  messageInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.windAlert,
    marginBottom: 8,
  },
  successText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark,
    marginBottom: 12,
  },
  submitButton: {
    paddingVertical: 11,
    borderRadius: radius.xl,
    alignItems: "center",
    backgroundColor: colors.accent,
  },
  submitText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.white,
  },
});
