import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Header.module.css';
import { Menu, X, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import Avatar from '../ui/Avatar';

export default function Header({
    user,
    isAdmin = false,
    onModeSwitch,
    showModeSwitch = true
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.leftSection}>
                    <button
                        className={styles.menuButton}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Menu"
                    >
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoText}>Villa Mar</span>
                    </Link>
                </div>

                <div className={styles.rightSection}>
                    {showModeSwitch && (
                        <button
                            className={`${styles.modeSwitch} ${isAdmin ? styles.adminMode : styles.userMode}`}
                            onClick={() => router.push('/')}
                            title="Trocar de modo"
                        >
                            <div className={styles.modeIcon}>
                                <ArrowLeftRight size={14} />
                            </div>
                            <span>{isAdmin ? 'Admin' : 'Equipa'}</span>
                        </button>
                    )}

                    <div className={styles.userSection}>
                        <Avatar
                            name={user?.name || 'Utilizador'}
                            size="sm"
                            status="online"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Menu Backdrop */}
            {menuOpen && (
                <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />
            )}

            {/* Mobile Sidebar (Slide-out) */}
            <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}>
                <div className={styles.menuHeader}>
                    <span className={styles.menuTitle}>Menu</span>
                    <button className={styles.closeButton} onClick={() => setMenuOpen(false)}>
                        <X size={20} />
                    </button>
                </div>
                {/* Content would go here, mimicking Sidebar links */}
                <div className={styles.menuContent}>
                    {/* Links would be repeated here or component reused */}
                </div>
            </div>
        </header>
    );
}
