import styles from './Card.module.css';

export default function Card({
    children,
    variant = 'default',
    padding = 'md',
    hover = false,
    className = '',
    ...props
}) {
    const classes = [
        styles.card,
        styles[variant],
        styles[`padding-${padding}`],
        hover && styles.hover,
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }) {
    return (
        <div className={`${styles.header} ${className}`}>
            {children}
        </div>
    );
}

export function CardTitle({ children, icon: Icon, className = '' }) {
    return (
        <h3 className={`${styles.title} ${className}`}>
            {Icon && <Icon size={20} className={styles.titleIcon} />}
            {children}
        </h3>
    );
}

export function CardContent({ children, className = '' }) {
    return (
        <div className={`${styles.content} ${className}`}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '' }) {
    return (
        <div className={`${styles.footer} ${className}`}>
            {children}
        </div>
    );
}
