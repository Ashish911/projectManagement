export const UPDATE_PREFERENCE = `
  mutation UpdatePreference($theme: Theme, $language: Language) {
    updatePreference(theme: $theme, language: $language) {
      id
      theme
      language
    }
  }
`;
