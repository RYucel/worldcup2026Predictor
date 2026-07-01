import { useI18n } from '../i18n'

interface SplashLoaderProps {
  isFading: boolean
}

export default function SplashLoader({ isFading }: SplashLoaderProps) {
  const { t } = useI18n()

  return (
    <div className={`splash-container${isFading ? ' splash-fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-logo-container">
          <img
            src={`${import.meta.env.BASE_URL}world_cup_2026_logo.png`}
            alt="2026 World Cup Logo"
            className="splash-logo"
          />
          <div className="splash-spinner" />
        </div>
        <h1 className="splash-title">{t('appName')}</h1>
        <p className="splash-subtitle">{t('appSub')}</p>
      </div>
    </div>
  )
}
