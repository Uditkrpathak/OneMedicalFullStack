import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

export default function GradientView({
  colors = ['#046582', '#004c8f', '#002663'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  children,
  ...props
}) {
  const gradientId = `grad_${Math.random().toString(36).substring(2, 9)}`;

  // Extract borderRadius if defined in style
  const flatStyle = StyleSheet.flatten(style) || {};
  const borderRadius = flatStyle.borderRadius || 0;

  return (
    <View style={[styles.container, style]} {...props}>
      <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
        <Defs>
          <LinearGradient
            id={gradientId}
            x1={`${(start?.x ?? 0) * 100}%`}
            y1={`${(start?.y ?? 0) * 100}%`}
            x2={`${(end?.x ?? 1) * 100}%`}
            y2={`${(end?.y ?? 1) * 100}%`}
          >
            {colors.map((color, index) => {
              const offset = `${(index / Math.max(colors.length - 1, 1)) * 100}%`;
              return <Stop key={index} offset={offset} stopColor={color} stopOpacity="1" />;
            })}
          </LinearGradient>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill={`url(#${gradientId})`}
          rx={borderRadius}
          ry={borderRadius}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
});
