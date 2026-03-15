import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminInsulinaRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/area-medica');
    }, [router]);

    return null;
}
