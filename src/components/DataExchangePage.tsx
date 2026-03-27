import { useState, useEffect, useCallback } from 'react';
import { useTranslate, useNotify } from 'react-admin';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Stack,
    Switch,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Typography,
    Paper,
    Chip,
    MenuItem,
    Select,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface ContentTypeInfo {
    name: string;
    entityClass: string;
    singleton: boolean;
    recordCount: number;
}

interface ImportManifest {
    format_version: string;
    exported_at: string;
    source: string;
    entity_types: string[];
    record_counts: Record<string, number>;
}

interface ImportSession {
    tempId: string;
    manifest: ImportManifest;
}

interface ImportResults {
    imported: Record<string, number>;
    warnings: string[];
}

const API_BASE = '/api/system/data-exchange';

function getBaseUrl(): string {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    return apiUrl.replace(/\/api$/, '');
}

async function apiFetch(path: string, options?: RequestInit) {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            ...options?.headers,
        },
    });
    return response;
}

export function DataExchangePage() {
    const translate = useTranslate();
    const [tab, setTab] = useState(0);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <SwapHorizIcon color="primary" />
                <Typography variant="h5">{translate('system.dataExchange.title')}</Typography>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                <Tab
                    icon={<FileDownloadIcon />}
                    iconPosition="start"
                    label={translate('system.dataExchange.export')}
                />
                <Tab
                    icon={<FileUploadIcon />}
                    iconPosition="start"
                    label={translate('system.dataExchange.import')}
                />
            </Tabs>

            {tab === 0 && <ExportTab />}
            {tab === 1 && <ImportTab />}
        </Box>
    );
}

function ExportTab() {
    const translate = useTranslate();
    const notify = useNotify();

    const [types, setTypes] = useState<ContentTypeInfo[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [pretty, setPretty] = useState(false);
    const [withMedia, setWithMedia] = useState(false);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const loadTypes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`${API_BASE}/types`, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setTypes(data);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTypes();
    }, [loadTypes]);

    const toggleType = (name: string) => {
        setSelectedTypes((prev) =>
            prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
        );
    };

    const toggleAll = () => {
        if (selectedTypes.length === types.length) {
            setSelectedTypes([]);
        } else {
            setSelectedTypes(types.map((t) => t.name));
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch(`${getBaseUrl()}${API_BASE}/export`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ types: selectedTypes, pretty, withMedia }),
            });

            if (!res.ok) {
                notify(translate('system.dataExchange.exportError'), { type: 'error' });
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `data-exchange-${new Date().toISOString().slice(0, 10)}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            notify(translate('system.dataExchange.exportSuccess'), { type: 'success' });
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Card variant="outlined">
            <CardContent>
                <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{translate('system.dataExchange.selectTypes')}</Typography>
                        <Button size="small" onClick={toggleAll}>
                            {selectedTypes.length === types.length
                                ? translate('system.dataExchange.deselectAll')
                                : translate('system.dataExchange.selectAll')}
                        </Button>
                    </Box>

                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            indeterminate={selectedTypes.length > 0 && selectedTypes.length < types.length}
                                            checked={selectedTypes.length === types.length}
                                            onChange={toggleAll}
                                        />
                                    </TableCell>
                                    <TableCell>{translate('system.dataExchange.typeName')}</TableCell>
                                    <TableCell align="right">{translate('system.dataExchange.recordCount')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {types.map((type) => (
                                    <TableRow
                                        key={type.name}
                                        hover
                                        onClick={() => toggleType(type.name)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox checked={selectedTypes.includes(type.name)} />
                                        </TableCell>
                                        <TableCell>
                                            {type.name}
                                            {type.singleton && (
                                                <Chip label="singleton" size="small" sx={{ ml: 1 }} />
                                            )}
                                        </TableCell>
                                        <TableCell align="right">{type.recordCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Stack direction="row" spacing={3}>
                        <FormControlLabel
                            control={<Switch checked={pretty} onChange={(e) => setPretty(e.target.checked)} />}
                            label={translate('system.dataExchange.prettyJson')}
                        />
                        <FormControlLabel
                            control={<Switch checked={withMedia} onChange={(e) => setWithMedia(e.target.checked)} />}
                            label={translate('system.dataExchange.withMedia')}
                        />
                    </Stack>

                    <Box>
                        <Button
                            variant="contained"
                            startIcon={exporting ? <CircularProgress size={16} /> : <FileDownloadIcon />}
                            onClick={handleExport}
                            disabled={exporting || selectedTypes.length === 0}
                        >
                            {translate('system.dataExchange.exportButton')}
                        </Button>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function ImportTab() {
    const translate = useTranslate();
    const notify = useNotify();

    const [session, setSession] = useState<ImportSession | null>(null);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [dryRun, setDryRun] = useState(true);
    const [onMissingRef, setOnMissingRef] = useState('warn');
    const [uploading, setUploading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [results, setResults] = useState<ImportResults | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setResults(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${getBaseUrl()}${API_BASE}/import/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                notify(err.error || translate('system.dataExchange.uploadError'), { type: 'error' });
                return;
            }

            const data: ImportSession = await res.json();
            setSession(data);
            setSelectedTypes(data.manifest.entity_types);
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const toggleType = (name: string) => {
        setSelectedTypes((prev) =>
            prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
        );
    };

    const handleImport = async () => {
        if (!session) return;

        setImporting(true);
        try {
            const res = await apiFetch(`${API_BASE}/import/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tempId: session.tempId,
                    types: selectedTypes,
                    dryRun,
                    onMissingRef,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                notify(err.error || translate('system.dataExchange.importError'), { type: 'error' });
                return;
            }

            const data: ImportResults = await res.json();
            setResults(data);

            if (!dryRun) {
                setSession(null);
            }

            notify(
                dryRun
                    ? translate('system.dataExchange.dryRunComplete')
                    : translate('system.dataExchange.importSuccess'),
                { type: 'success' },
            );
        } finally {
            setImporting(false);
        }
    };

    return (
        <Stack spacing={3}>
            {/* Step 1: Upload */}
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {translate('system.dataExchange.step1Upload')}
                    </Typography>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={uploading ? <CircularProgress size={16} /> : <FileUploadIcon />}
                            disabled={uploading}
                        >
                            {translate('system.dataExchange.chooseFile')}
                            <input
                                type="file"
                                accept=".zip"
                                hidden
                                onChange={handleFileUpload}
                            />
                        </Button>

                        {session && (
                            <Chip
                                icon={<CheckCircleIcon />}
                                label={`${session.manifest.entity_types.length} ${translate('system.dataExchange.typesDetected')}`}
                                color="success"
                                variant="outlined"
                            />
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* Step 2: Configure and execute import */}
            {session && (
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            {translate('system.dataExchange.step2Import')}
                        </Typography>

                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                {translate('system.dataExchange.exportedAt')}: {new Date(session.manifest.exported_at).toLocaleString()}
                            </Typography>

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    indeterminate={
                                                        selectedTypes.length > 0 &&
                                                        selectedTypes.length < session.manifest.entity_types.length
                                                    }
                                                    checked={selectedTypes.length === session.manifest.entity_types.length}
                                                    onChange={() => {
                                                        if (selectedTypes.length === session.manifest.entity_types.length) {
                                                            setSelectedTypes([]);
                                                        } else {
                                                            setSelectedTypes([...session.manifest.entity_types]);
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>{translate('system.dataExchange.typeName')}</TableCell>
                                            <TableCell align="right">{translate('system.dataExchange.recordCount')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {session.manifest.entity_types.map((typeName) => (
                                            <TableRow
                                                key={typeName}
                                                hover
                                                onClick={() => toggleType(typeName)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox checked={selectedTypes.includes(typeName)} />
                                                </TableCell>
                                                <TableCell>{typeName}</TableCell>
                                                <TableCell align="right">
                                                    {session.manifest.record_counts[typeName] ?? '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Stack direction="row" spacing={3} alignItems="center">
                                <FormControlLabel
                                    control={
                                        <Switch checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                                    }
                                    label={translate('system.dataExchange.dryRun')}
                                />

                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {translate('system.dataExchange.onMissingRef')}
                                    </Typography>
                                    <Select
                                        size="small"
                                        value={onMissingRef}
                                        onChange={(e) => setOnMissingRef(e.target.value)}
                                        sx={{ minWidth: 120 }}
                                    >
                                        <MenuItem value="warn">{translate('system.dataExchange.warn')}</MenuItem>
                                        <MenuItem value="skip">{translate('system.dataExchange.skip')}</MenuItem>
                                        <MenuItem value="fail">{translate('system.dataExchange.fail')}</MenuItem>
                                    </Select>
                                </Box>
                            </Stack>

                            <Box>
                                <Button
                                    variant="contained"
                                    startIcon={importing ? <CircularProgress size={16} /> : <FileUploadIcon />}
                                    onClick={handleImport}
                                    disabled={importing || selectedTypes.length === 0}
                                >
                                    {dryRun
                                        ? translate('system.dataExchange.runDryRun')
                                        : translate('system.dataExchange.importButton')}
                                </Button>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {results && (
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            {translate('system.dataExchange.results')}
                        </Typography>

                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{translate('system.dataExchange.typeName')}</TableCell>
                                        <TableCell align="right">{translate('system.dataExchange.imported')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Object.entries(results.imported).map(([typeName, count]) => (
                                        <TableRow key={typeName}>
                                            <TableCell>{typeName}</TableCell>
                                            <TableCell align="right">{count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {results.warnings.length > 0 && (
                            <Stack spacing={1}>
                                <Typography variant="subtitle2" color="warning.main">
                                    {translate('system.dataExchange.warnings')} ({results.warnings.length})
                                </Typography>
                                {results.warnings.map((warning, i) => (
                                    <Alert key={i} severity="warning" variant="outlined" sx={{ py: 0 }}>
                                        {warning}
                                    </Alert>
                                ))}
                            </Stack>
                        )}
                    </CardContent>
                </Card>
            )}
        </Stack>
    );
}
