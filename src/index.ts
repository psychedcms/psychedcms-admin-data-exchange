import { registerPlugin } from '@psychedcms/admin-core';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DataExchangePage } from './components/DataExchangePage.tsx';
import { frMessages } from './i18n/fr.ts';
import { enMessages } from './i18n/en.ts';

registerPlugin({
    adminPages: [
        {
            path: 'data-exchange',
            component: DataExchangePage,
            menuLabel: 'Import / Export',
            menuIcon: SwapHorizIcon,
        },
    ],
    i18nMessages: { fr: frMessages, en: enMessages },
});

export { DataExchangePage } from './components/DataExchangePage.tsx';
