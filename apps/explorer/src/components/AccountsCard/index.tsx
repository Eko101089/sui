// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ParentSize } from '@visx/responsive';
import clsx from 'clsx';

import { AreaGraph } from '../AreaGraph';
import { FormattedStatsAmount } from '../HomeMetrics/FormattedStatsAmount';
import { ErrorBoundary } from '../error-boundary/ErrorBoundary';
import { useGetAddressMetrics } from '~/hooks/useGetAddressMetrics';
import { useGetAllEpochAddressMetrics } from '~/hooks/useGetAllEpochAddressMetrics';
import { Card } from '~/ui/Card';
import { Heading } from '~/ui/Heading';
import { LoadingSpinner } from '~/ui/LoadingSpinner';
import { Text } from '~/ui/Text';

const formatter = Intl.NumberFormat('en', { notation: 'compact' });

export function AccountsCard() {
	const { data: addressMetrics } = useGetAddressMetrics();
	const { data: allEpochMetrics, isLoading } = useGetAllEpochAddressMetrics({
		descendingOrder: false,
	});
	return (
		<Card bg="white" spacing="lg" border="steel">
			<div className="flex flex-col gap-4">
				<Heading variant="heading4/semibold" color="steel-darker">
					Accounts
				</Heading>
				<div className="flex flex-wrap gap-6">
					<FormattedStatsAmount
						orientation="vertical"
						label="Total"
						tooltip="Addresses that have participated in at least one transaction since network genesis"
						amount={addressMetrics?.cumulativeAddresses}
						size="sm"
					/>
					<FormattedStatsAmount
						orientation="vertical"
						label="Total Active"
						tooltip="Total active addresses"
						amount={addressMetrics?.cumulativeActiveAddresses}
						size="sm"
					/>
					<FormattedStatsAmount
						orientation="vertical"
						label="Daily Active"
						tooltip="Total daily active addresses"
						amount={addressMetrics?.dailyActiveAddresses}
						size="sm"
					/>
				</div>
				<div
					className={clsx(
						'flex min-h-[180px] flex-1 flex-col items-center justify-center rounded-b-xl transition-colors',
						!allEpochMetrics?.length && 'bg-gray-40',
					)}
				>
					{isLoading ? (
						<div className="flex flex-col items-center gap-1">
							<LoadingSpinner />
							<Text color="steel" variant="body/medium">
								loading data
							</Text>
						</div>
					) : allEpochMetrics?.length ? (
						<div className="relative flex-1 self-stretch">
							<ErrorBoundary>
								<ParentSize className="absolute">
									{({ height, width }) => (
										<AreaGraph
											data={allEpochMetrics}
											height={height}
											width={width}
											getX={({ epoch }) => epoch}
											getY={({ cumulativeActiveAddresses }) => cumulativeActiveAddresses}
											color="blue"
											formatY={formatter.format}
										/>
									)}
								</ParentSize>
							</ErrorBoundary>
						</div>
					) : (
						<Text color="steel" variant="body/medium">
							No historical data available
						</Text>
					)}
				</div>
			</div>
		</Card>
	);
}
