import styles from './Avatar.module.css';

export default function Avatar({
    src,
    name = '',
    size = 'md',
    status,
    className = '',
    ...props
}) {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const classes = [
        styles.avatar,
        styles[size],
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props}>
            {src ? (
                <img src={src} alt={name} className={styles.image} />
            ) : (
                <span className={styles.initials}>{initials}</span>
            )}
            {status && (
                <span className={`${styles.status} ${styles[`status-${status}`]}`} />
            )}
        </div>
    );
}
