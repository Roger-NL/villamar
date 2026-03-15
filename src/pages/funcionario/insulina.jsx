import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function FuncionarioInsulinaRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/funcionario/area-medica');
    }, [router]);

    return null;
}
