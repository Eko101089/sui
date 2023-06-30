// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveBasis } from '@visx/curve';
import { localPoint } from '@visx/event';
import { PatternCircles } from '@visx/pattern';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { useTooltipInPortal, useTooltip } from '@visx/tooltip';
import clsx from 'clsx';
import { bisector, extent } from 'd3-array';
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { throttle } from 'throttle-debounce';

import { GraphTooltipContent } from './GraphTooltipContent';

let idCounter = 0;

function getID(prefix: string) {
	return `${prefix}_${idCounter++}`;
}

const bisectX = bisector((x: number) => x).center;

export type AreaGraphProps<D> = {
	data: D[];
	width: number;
	height: number;
	getX: (element: D) => number;
	getY: (element: D) => number;
	formatX?: (x: number) => string;
	formatY?: (y: number) => string;
	color: 'blue' | 'yellow';
	tooltip?: ReactElement;
};

export function AreaGraph<D>({
	data,
	width,
	height,
	getX,
	getY,
	formatX,
	formatY,
	color,
	tooltip,
}: AreaGraphProps<D>) {
	const graphTop = 15;
	const graphBottom = Math.max(0, height - 30);
	const graphLeft = 45;
	const graphRight = Math.max(0, width - 15);
	const [fillGradientID] = useState(() => getID('areaGraph_fillGradient'));
	const [lineGradientID] = useState(() => getID('areaGraph_lineGradient'));
	const [patternID] = useState(() => getID('areaGraph_pattern'));
	const { TooltipInPortal, containerRef } = useTooltipInPortal({
		scroll: true,
	});
	const { tooltipOpen, hideTooltip, showTooltip, tooltipData, tooltipLeft, tooltipTop } =
		useTooltip<D>({
			tooltipLeft: 0,
			tooltipTop: 0,
		});
	const xScale = useMemo(
		() =>
			scaleLinear<number>({
				domain: extent(data, getX) as [number, number],
				range: [graphLeft, graphRight],
			}),
		[data, graphRight, graphLeft],
	);
	const yScale = useMemo(
		() =>
			scaleLinear<number>({
				domain: extent(data, getY) as [number, number],
				range: [graphBottom, graphTop],
				nice: true,
			}),
		[data, graphTop, graphBottom],
	);
	const handleTooltip = useCallback(
		(x: number) => {
			const selectedData = data[bisectX(data.map(getX), xScale.invert(x), 0)];
			showTooltip({
				tooltipData: selectedData,
				tooltipLeft: xScale(getX(selectedData)),
				tooltipTop: yScale(getY(selectedData)),
			});
		},
		[xScale, yScale, showTooltip, data, getX, getY],
	);
	const [handleTooltipThrottled, setHandleTooltipThrottled] =
		useState<ReturnType<typeof throttle>>();
	const handleTooltipThrottledRef = useRef<ReturnType<typeof throttle>>();
	useEffect(() => {
		handleTooltipThrottledRef.current = throttle(100, handleTooltip);
		setHandleTooltipThrottled(() => handleTooltipThrottledRef.current);
		return () => {
			handleTooltipThrottledRef?.current?.cancel?.();
		};
	}, [handleTooltip]);
	if (width < 100 || height < 100) {
		return null;
	}
	return (
		<div className="relative h-full w-full overflow-hidden" ref={containerRef}>
			{tooltipOpen && tooltipData ? (
				<TooltipInPortal
					key={Math.random()} // needed for bounds to update correctly
					offsetLeft={0}
					offsetTop={0}
					left={tooltipLeft}
					top={0}
					className="pointer-events-none absolute z-10 h-0 w-max overflow-visible"
					unstyled
					detectBounds
				>
					<GraphTooltipContent>{JSON.stringify(tooltipData)}</GraphTooltipContent>
				</TooltipInPortal>
			) : null}
			<svg width={width} height={height}>
				<defs>
					<linearGradient id={fillGradientID} gradientTransform="rotate(90)">
						{color === 'yellow' ? (
							<>
								<stop stopColor="#F2BD24" />
								<stop offset="59%" stopColor="#F2BD24" stopOpacity="40%" />
								<stop offset="100%" stopColor="#FFF8E2" stopOpacity="0%" />
							</>
						) : (
							<>
								<stop stopColor="#00F9FB" />
								<stop offset="59%" stopColor="#7CE7FF" stopOpacity="28%" />
								<stop offset="100%" stopColor="#FBF1FD" stopOpacity="0%" />
							</>
						)}
					</linearGradient>
					<linearGradient id={lineGradientID} gradientTransform="rotate(90)">
						{color === 'yellow' ? (
							<>
								<stop stopColor="#F2BD24" />
								<stop offset="100%" stopColor="#8D6E15" />
							</>
						) : (
							<>
								<stop stopColor="#00EEAC" />
								<stop offset="100%" stopColor="#008BE9" />
							</>
						)}
					</linearGradient>
				</defs>
				<PatternCircles id={patternID} height={5} width={5} radius={1} fill="#c5e9e0" />
				<AreaClosed<D>
					curve={curveBasis}
					data={data}
					yScale={yScale}
					x={(d) => xScale(getX(d))}
					y={(d) => yScale(getY(d))}
					fill={`url(#${fillGradientID})`}
					stroke="transparent"
				/>
				<AreaClosed<D>
					curve={curveBasis}
					data={data}
					yScale={yScale}
					x={(d) => xScale(getX(d))}
					y={(d) => yScale(getY(d))}
					fill={`url(#${patternID})`}
					stroke="transparent"
				/>
				<LinePath<D>
					curve={curveBasis}
					data={data}
					x={(d) => xScale(getX(d))}
					y={(d) => yScale(getY(d))}
					stroke={`url(#${lineGradientID})`}
					width="1"
				/>
				<AxisBottom
					top={height - 20}
					orientation="bottom"
					scale={xScale}
					tickFormat={formatX ? (x) => formatX(x.valueOf()) : String}
					hideTicks
					hideAxisLine
					tickValues={xScale
						.ticks(Math.min(data.length, Math.floor((width - 50) / 40)))
						.filter(Number.isInteger)}
					tickComponent={({ x, y, formattedValue }) => (
						<text x={x} y={y} className="fill-steel font-sans text-subtitleSmall font-medium">
							{formattedValue}
						</text>
					)}
				/>
				<AxisLeft
					left={10}
					orientation="left"
					scale={yScale}
					tickFormat={formatY ? (y) => formatY(y.valueOf()) : String}
					hideTicks
					hideAxisLine
					tickValues={yScale.ticks(6).filter(Number.isInteger)}
					tickComponent={({ x, y, formattedValue }) => (
						<text
							x={x}
							y={y}
							textAnchor="start"
							alignmentBaseline="middle"
							className="fill-steel font-sans text-subtitleSmall font-medium"
						>
							{formattedValue}
						</text>
					)}
				/>
				<line
					x1={0}
					y1={Math.max(graphTop - 5, 0)}
					x2={0}
					y2={Math.max(height - 20, 0)}
					className={clsx('stroke-steel/80', tooltipOpen ? 'opacity-100' : 'opacity-0')}
					strokeWidth="1"
					transform={tooltipLeft ? `translate(${tooltipLeft})` : ''}
				/>
				<line
					x1={0}
					y1={0}
					x2={width}
					y2={0}
					className={clsx('stroke-steel/80', tooltipOpen ? 'opacity-100' : 'opacity-0')}
					strokeWidth="1"
					transform={tooltipTop ? `translate(0, ${tooltipTop})` : ''}
				/>
				<rect
					x={graphLeft}
					y={graphTop}
					width={graphRight - graphLeft}
					height={graphBottom - graphTop}
					fill="transparent"
					stroke="none"
					onMouseEnter={(e) => {
						handleTooltipThrottled?.(localPoint(e)?.x || graphLeft);
					}}
					onMouseMove={(e) => {
						console.log(localPoint(e)?.x);
						handleTooltipThrottled?.(localPoint(e)?.x || graphLeft);
					}}
					onMouseLeave={() => {
						handleTooltipThrottled?.cancel({
							upcomingOnly: true,
						});
						hideTooltip();
					}}
				/>
			</svg>
		</div>
	);
}
