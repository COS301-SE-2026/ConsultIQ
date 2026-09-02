import { render, screen } from '@testing-library/react';
import AnalyticsPage from '../src/features/admin/pages/analytics-dashboard'
import { BrowserRouter } from 'react-router-dom';
import {
  getOverallUtilisation,
  getOverallBenchCount,
  getUtilisationBySkillCategory,
  getBenchBySkillCategory,
  getPlacementsBySkillCategory,
  getCvParsingStats,
} from '../src/features/admin/services/admin-analytics.service';

interface MockChartProps {
  title: string;
  data: unknown;
}

jest.mock('../src/features/admin/services/admin-analytics.service', () => ({
  getOverallUtilisation: jest.fn(),
  getOverallBenchCount: jest.fn(),
  getUtilisationBySkillCategory: jest.fn(),
  getBenchBySkillCategory: jest.fn(),
  getPlacementsBySkillCategory: jest.fn(),
  getCvParsingStats: jest.fn(),
}));


jest.mock('../src/features/admin/components/donut-chart', () => ({
  __esModule: true,
  default: (props: MockChartProps) => (
    <div data-testid={`donut-${props.title}`}>{JSON.stringify(props.data)}</div>
  ),
}));

jest.mock('../src/features/admin/components/bar-graph', () => ({
  __esModule: true,
  default: (props: MockChartProps) => (
    <div data-testid={`bar-${props.title}`}>{JSON.stringify(props.data)}</div>
  ),
}));

jest.mock('../src/components/layout/sidebar/sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar" />,
}));

jest.mock('../src/components/layout/sidebar/sidebar.config', () => ({
  adminSidebarItems: [],
}));

const mockUtilisation = { totalConsultants: 42, utilisedConsultants: 31, utilisationPercent: 73.8 };
const mockBench = { count: 11 };
const mockUtilBySkill = [
  { category: 'Cloud & DevOps', totalConsultants: 12, utilisedConsultants: 9, utilisationPercent: 75 },
];
const mockBenchBySkill = [{ category: 'Cloud & DevOps', benchCount: 3 }];
const mockPlacements = [{ category: 'Cloud & DevOps', placementCount: 7 }];
const mockCvStats = {
  totalProcessed: 150,
  ruleBasedCount: 90,
  aiAssistedCount: 60,
  failedCount: 8,
  successCount: 142,
  averageConfidence: 0.87,
};

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <AnalyticsPage />
      </BrowserRouter>
    );

  const mockAllSucceed = () => {
    (getOverallUtilisation as jest.Mock).mockResolvedValue(mockUtilisation);
    (getOverallBenchCount as jest.Mock).mockResolvedValue(mockBench);
    (getUtilisationBySkillCategory as jest.Mock).mockResolvedValue(mockUtilBySkill);
    (getBenchBySkillCategory as jest.Mock).mockResolvedValue(mockBenchBySkill);
    (getPlacementsBySkillCategory as jest.Mock).mockResolvedValue(mockPlacements);
    (getCvParsingStats as jest.Mock).mockResolvedValue(mockCvStats);
  };

  const mockOneFailure = () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (getOverallUtilisation as jest.Mock).mockResolvedValue(mockUtilisation);
    (getOverallBenchCount as jest.Mock).mockResolvedValue(mockBench);
    (getUtilisationBySkillCategory as jest.Mock).mockResolvedValue(mockUtilBySkill);
    (getBenchBySkillCategory as jest.Mock).mockResolvedValue(mockBenchBySkill);
    (getPlacementsBySkillCategory as jest.Mock).mockRejectedValue(new Error('network error'));
    (getCvParsingStats as jest.Mock).mockResolvedValue(mockCvStats);
};

  it('should show a loading state before the analytics calls resolve', () => {
    (getOverallUtilisation as jest.Mock).mockReturnValue(new Promise(() => {}));
    (getOverallBenchCount as jest.Mock).mockReturnValue(new Promise(() => {}));
    (getUtilisationBySkillCategory as jest.Mock).mockReturnValue(new Promise(() => {}));
    (getBenchBySkillCategory as jest.Mock).mockReturnValue(new Promise(() => {}));
    (getPlacementsBySkillCategory as jest.Mock).mockReturnValue(new Promise(() => {}));
    (getCvParsingStats as jest.Mock).mockReturnValue(new Promise(() => {}));

    renderComponent();

    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });

  it('should render the overall utilisation percentage rounded to one decimal', async () => {
    mockAllSucceed();
    renderComponent();

    expect(await screen.findByText('73.8%')).toBeInTheDocument();
  });

  it('should render the consultant subtitle count from the utilisation response', async () => {
    mockAllSucceed();
    renderComponent();

    expect(await screen.findByText(/42 consultants total/i)).toBeInTheDocument();
  });

  it('should render the bench count with the "consultants" suffix', async () => {
    mockAllSucceed();
    renderComponent();

    expect(await screen.findByText(/11 consultants/i)).toBeInTheDocument();
  });

  it('should compute and render the CV parsing success rate from raw counts, not a pre-formatted field', async () => {
    mockAllSucceed();
    renderComponent();

    // 142 / 150 = 94.666...% — rounds to 95%, confirming this is actually
    // being derived, not just echoing a hardcoded string.
    expect(await screen.findByText('95%')).toBeInTheDocument();
  });

  it('should convert averageConfidence from a 0–1 fraction into a percentage', async () => {
    mockAllSucceed();
    renderComponent();

    expect(await screen.findByText('87%')).toBeInTheDocument();
  });

  it('should show an error banner naming exactly how many sections failed', async () => {
    mockOneFailure();
    renderComponent();

    expect(await screen.findByText(/1 of 6 analytics sections failed to load/i)).toBeInTheDocument();
  });

  it('should still render the sections that succeeded when one endpoint fails', async () => {
    mockOneFailure();
    renderComponent();

    expect(await screen.findByText('73.8%')).toBeInTheDocument();
  });

  it('should not show an error banner when every call succeeds', async () => {
    mockAllSucceed();
    renderComponent();

    await screen.findByText('73.8%'); // wait for load to finish
    expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
  });

  it('should pass merged utilisation-and-bench data to the bar chart, not raw skill-only data', async () => {
    mockAllSucceed();
    renderComponent();

    const chart = await screen.findByTestId('bar-Utilisation vs Bench');
    const passedData = JSON.parse(chart.textContent || '[]');

    expect(passedData[0]).toMatchObject({ category: 'Cloud & DevOps', utilised: 9, bench: 3 });
  });

  it('should pass live placements-by-skill data to its bar chart, not mock data', async () => {
    mockAllSucceed();
    renderComponent();

    const chart = await screen.findByTestId('bar-Placements per skill');
    expect(chart.textContent).toContain('"placementCount":7');
  });

  it('KNOWN GAP: Skill Distribution still renders mock data, since getSkillDistribution() does not exist yet', async () => {
    mockAllSucceed();
    renderComponent();

    // This test documents a real, current limitation, not a passing
    // feature — once Siya's endpoint lands and the page is wired to it,
    // this test should be rewritten to assert real fetched data instead.
    const chart = await screen.findByTestId('donut-Skill Distribution');
    expect(chart.textContent).toContain('Cloud & DevOps');
  });
});