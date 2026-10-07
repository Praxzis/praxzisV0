import { router } from 'expo-router';
import { View } from 'react-native';

import { BackLink, Divider, Hand, NotebookPage, Print, useNotebook } from '@/notebook';

const SECTIONS: { label: string; title: string; body: string }[] = [
  {
    label: 'i',
    title: 'The notebook',
    body: 'Praxzis is a private notebook for the books you read, the lines you mark, and the choices you sit with. It is a tool for thinking. It is not a substitute for a lawyer, a doctor, a therapist, or anyone who owes you professional care.',
  },
  {
    label: 'ii',
    title: 'Your pages',
    body: 'The books, passages, notes, and questions you write belong to you. We do not sell them, and we do not use them to advertise to you. If you keep a cloud copy, we store it so the same notebook can open on another desk. You may take a copy with you, or remove the notebook from a device, whenever you like.',
  },
  {
    label: 'iii',
    title: 'The council',
    body: 'The Council gathers passages from your pages, or recommends books from a wider shelf, and offers a reading of a choice you describe. It can be useful. It can also be wrong. It may misread a line, miss a context, sound more sure than it has earned, or suggest a next step that does not fit your life. It is not advice. You remain responsible for what you do. When counsel is set to go deeper, a language model may help phrase the gathering. That reading is still fallible. Check the marked line before you trust the voice.',
  },
  {
    label: 'iv',
    title: 'Accounts',
    body: 'A signature — email, Google, or Apple — opens a copy you can carry to another device. Staying on this desk only keeps the notebook here. Protect your password. You are responsible for activity under your signature.',
  },
  {
    label: 'v',
    title: 'Age',
    body: 'You must be at least sixteen, or the age of digital consent where you live, whichever is higher. If you are under eighteen, a parent or guardian should know you are using this notebook.',
  },
  {
    label: 'vi',
    title: 'Fair use',
    body: 'Do not use Praxzis to harm others, to break the law, or to keep material you do not have the right to keep. Do not try to disrupt the service or another person’s copy.',
  },
  {
    label: 'vii',
    title: 'No warranty',
    body: 'Praxzis is offered as it is. We work to keep the desk steady, but we do not promise it will be uninterrupted, error-free, or fit for a particular purpose.',
  },
  {
    label: 'viii',
    title: 'Limitation',
    body: 'To the fullest extent the law allows, Praxzis and its makers are not liable for decisions you make after sitting with the council, for lost notes, or for indirect or consequential damages. If the notebook does not serve you, your remedy is to close the cover and stop using it.',
  },
  {
    label: 'ix',
    title: 'Changes',
    body: 'We may update these terms. A material change will be dated on this page. Continued use after that date means you accept the new terms.',
  },
];

export default function Terms() {
  const { m } = useNotebook();

  return (
    <NotebookPage seed="terms">
      <BackLink label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))} />

      <Print variant="label" accessibilityRole="header" style={{ marginTop: 8 }}>
        The terms
      </Print>
      <Hand seed="terms-title" size="title" tone="navy" slant={-1} style={{ marginTop: 6 }}>
        Before the first page
      </Hand>
      <Print variant="body" tone="graphite" style={{ marginTop: 12 }}>
        These are the conditions of using Praxzis. Please read them. By signing a copy — with email, Google, Apple, or by staying on this desk — you agree.
      </Print>

      {SECTIONS.map((s, i) => (
        <View key={s.label} style={{ marginTop: i === 0 ? 28 : 22 }}>
          <Print variant="label">
            {s.label}. {s.title}
          </Print>
          <Print variant="body" style={{ marginTop: 8 }}>
            {s.body}
          </Print>
        </View>
      ))}

      <Divider seed="terms-end" style={{ marginTop: 32, marginBottom: 16, opacity: 0.5 }} />
      <Hand seed="terms-colophon" size="small" tone="turquoise" slant={-1.2}>
        Last set · 7 October 2026
      </Hand>
      <Print variant="meta" tone="pencil" style={{ marginTop: 8, color: m.graphite }}>
        Questions about these terms belong at the back of the book, in a signed copy.
      </Print>
    </NotebookPage>
  );
}
