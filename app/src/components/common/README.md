# Design System — `components/common`

Composants UI partagés de l'app Pregnancy. Style ancré sur les tokens de
`src/theme`. Aucune dépendance externe : Animated API native, RTL via
`I18nManager` (textAlign hérité du contexte i18n).

## Tokens (`theme/index.ts`)

| Catégorie       | Clés                                                                                 |
| --------------- | ------------------------------------------------------------------------------------ |
| `colors`        | `primary`, `secondary`, `accent`, `background`, `surface`, `surfaceElevated`, `text`, `textSecondary`, `textLight`, `error`, `success`, `warning`, `info`, `border`, `borderLight`, `divider`, `overlay`, `placeholder`, `disabled` |
| `spacing`       | `xs (4)`, `s (8)`, `m (16)`, `l (24)`, `xl (32)`                                    |
| `borderRadius`  | `s (8)`, `m (12)`, `l (16)`, `xl (20)`, `card (16)`, `round (999)`                  |
| `typography`    | `h1`, `h2`, `h3`, `body`, `caption`, `caption2`, `button`, `label`                  |
| `shadows`       | `sm`, `md`, `lg` (cross-platform iOS/Android/Web)                                   |
| `animation`     | `durations.{fast,base,slow}`, `easings.{out,inOut}`                                  |

## Composants

### `Button`

```tsx
<Button title="Continuer" onPress={next} />
<Button variant="outline" size="small" title="Annuler" onPress={cancel} />
<Button variant="destructive" title="Supprimer" onPress={remove} loading={isPending} />
<Button variant="ghost" title="Plus tard" onPress={skip} />
```

- `variant`: `primary` | `secondary` | `outline` | `destructive` | `ghost` | `success`
- `size`: `small` | `medium` (défaut) | `large`
- `loading` ➜ ActivityIndicator + `accessibilityState.busy`
- `disabled` ➜ couleurs grisées + `accessibilityState.disabled`

### `Skeleton`

```tsx
<Skeleton width={200} height={20} radius={4} />
<Skeleton.Card />
<Skeleton.Avatar size={48} />
<Skeleton.Line width="80%" />
<Skeleton.Title />
```

- Animation pulse `opacity 0.3 ↔ 0.7` (Animated.loop, useNativeDriver).
- `animated={false}` pour figer (snapshot tests).
- `width` accepte number ou pourcentage (`"80%"`).
- Cleanup automatique au unmount.

### `EmptyState`

```tsx
<EmptyState
  icon="📭"
  title={t('home.noData')}
  subtitle={t('home.noDataSubtitle')}
  action={<Button title={t('common.refresh')} onPress={loadData} />}
/>
```

- `icon` accepte un `string` (emoji 56px) ou un `ReactNode`.
- `compact` réduit le padding pour une intégration inline (dans une card).
- Le label a11y est composé automatiquement à partir de `title` + `subtitle`.

### `Badge`

```tsx
<Badge variant="success">Normal</Badge>
<Badge variant="warning">Attention</Badge>
<Badge variant="error">Critique</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="primary" size="small">12</Badge>
```

- Variantes : `success`, `warning`, `error`, `info`, `neutral`, `primary`.
- Tailles : `small` (12px) | `medium` (14px).
- Background coloré à ~14 % d'opacité, texte couleur pleine.
- Cas d'usage : catégorie BMI, sévérité d'alerte clinique, statut RDV.

### Composants déjà existants

- `Card`, `CollapsibleCard` — conteneurs surélevés (`shadows.sm/md`).
- `LoadingScreen`, `ErrorBoundary`, `ErrorState`, `ErrorMessage`, `SuccessMessage`,
  `OfflineNotice` — états de page.
- `SectionHeader` — titre + action contextuelle.
- `Tag` — pastille legacy (préférer `Badge` pour les nouveaux usages).
- `LanguageSelector` — sélecteur i18n.

## Conventions A11y

- Tout élément interactif expose `accessibilityRole`.
- `Button` propage `accessibilityState.{ disabled, busy }`.
- `EmptyState` est un `summary` accessible avec `accessibilityLabel` composé.
- `Skeleton` est masqué de l'a11y tree (`accessibilityElementsHidden`).
- Texte décoratif (emoji icônes) marqué `accessibilityElementsHidden`.

## Conventions i18n / RTL

- Aucun composant n'embarque de string : tout passe par `t()` côté caller.
- `marginStart` / `paddingEnd` à privilégier sur `marginLeft` / `paddingRight`
  pour un RTL natif (déjà appliqué dans les composants existants comme `Tag`).

## Animations

- Toujours `useNativeDriver: true` pour `opacity` / `transform`.
- Cleanup obligatoire dans le `useEffect` (`sequence.stop()` au unmount).
- Durées via `theme.animation.durations` (jamais de magic numbers).
