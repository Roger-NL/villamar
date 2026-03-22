import { getFirebaseAdminProjectId, getIdentityToolkitAccessToken } from '@/server/firebaseAdmin';
import { listCollection } from '@/server/firestoreRest';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        const accessToken = await getIdentityToolkitAccessToken();
        const projectId = getFirebaseAdminProjectId();

        const [
            employeesList,
            tasksList,
            swapRequestsList,
            notificationsList,
            timeRecordsList,
            activeSessionsList,
            schedulesList,
            leavesList,
            dailyPlansList,
            dailyAnnouncementsList,
            inventoryItemsList,
            insulinPatientsList,
            insulinLogsList,
            medicalNotesList,
            diaperPatientsList,
            diaperLogsList
        ] = await Promise.all([
            listCollection('employees', accessToken, projectId),
            listCollection('tasks', accessToken, projectId),
            listCollection('swapRequests', accessToken, projectId),
            listCollection('notifications', accessToken, projectId),
            listCollection('timeRecords', accessToken, projectId),
            listCollection('activeSessions', accessToken, projectId),
            listCollection('schedules', accessToken, projectId),
            listCollection('leaves', accessToken, projectId),
            listCollection('dailyPlans', accessToken, projectId),
            listCollection('dailyAnnouncements', accessToken, projectId),
            listCollection('inventoryItems', accessToken, projectId),
            listCollection('insulinPatients', accessToken, projectId),
            listCollection('insulinLogs', accessToken, projectId),
            listCollection('medicalNotes', accessToken, projectId),
            listCollection('diaperPatients', accessToken, projectId),
            listCollection('diaperLogs', accessToken, projectId)
        ]);

        const activeSessions = {};
        activeSessionsList.forEach((item) => {
            activeSessions[item.id] = item;
        });

        const savedSchedules = {};
        schedulesList.forEach((item) => {
            savedSchedules[item.id] = item;
        });

        const dailyPlans = {};
        dailyPlansList.forEach((item) => {
            dailyPlans[item.id] = item;
        });

        const dailyAnnouncements = dailyAnnouncementsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const notifications = notificationsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json({
            employees: employeesList,
            tasks: tasksList,
            swapRequests: swapRequestsList,
            notifications,
            timeRecords: timeRecordsList,
            activeSessions,
            savedSchedules,
            leaves: leavesList,
            dailyPlans,
            dailyAnnouncements,
            inventoryItems: inventoryItemsList,
            insulinPatients: insulinPatientsList,
            insulinLogs: insulinLogsList,
            medicalNotes: medicalNotesList,
            diaperPatients: diaperPatientsList,
            diaperLogs: diaperLogsList
        });
    } catch (error) {
        console.error('public bootstrap api error', error);

        if (error.message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
            return res.status(500).json({
                error: 'Falta configurar as credenciais privadas do Firebase Admin.'
            });
        }

        return res.status(500).json({ error: 'Não foi possível carregar os dados operacionais.' });
    }
}
