[Context: Add built in debug layer feature]
* Implement a debug feature which creates a top layer and can either (via props)
  - Draw a grid
  - Draw the spatial partitioning
  - Draw the bounding boxes of all elements
  - Draw the invalidated regions of all elements when they occur (blended with a color that changes based on the type of invalidation)
  - Add to layer 14 demo
    - Add a button to toggle the debug layer
    - Add a button to toggle the grid
    - Add a button to toggle the spatial partitioning
    - Add a button to toggle the bounding boxes
    - Add a button to toggle the invalidated regions

[Context: Investigating hit detection performance optimisations]
* Investigate
  - This warning is from the console:
  ```
  arena-2d.js:1 Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently
  _sampleHitBuffer	@	arena-2d.js:1
  hitTest	@	arena-2d.js:1
  _handlePointerMove	@	arena-2d.js:1

  ```
  - Investigate if this indicates opportunity for optimisation
  - If bottlenecks can be identified, fix them
* Explore these optimisations:
  - Find bottlenecks, inefficiencies
  - Implement spatial partitioning (quadtree, k-d tree, etc.)
  - Implement caching
  - Implement multi-threading

* Add new Layer 1.1 - "Geometry"
  - Create efficient and fundamental geometry primitives
    - Point
    - Vector (support Polar and Cartesian coordinates)
    - Ray (origin and direction)
    - Line
    - Rectangle
    - Circle
    - Ellipse
    - Polygon (open and closed)
    - Arc
    - Bezier Curve
    - Quadratic Curve
    - Path
  - The primitives should be able to be used both in isolation, and as part of a scene graph (nesting, interaction)
    - This means that the primitives should be able to be transformed, nested, and interacted with if part of a scene, otherwise the can be constructed and nested outside of a scene for geometric calculations
  - All shapes should support parametric point along shape interpolation
  - All primitives should support via superclass:
    - Nesting (shapes transforms should be applied to nested shapes)
    - Transform (same as Element)
    - Find distance from given point to shape
    - Find closest point on shape to given point
    - Intersection with line
    - Intersection with other shapes
    - Area
    - Perimeter
    - Bounding box
    - Centroid (readonly)
  - All geometric operations should consider nested transforms to form a global space when point testing
  - Create Layer 1.1 Demo
    - Show all shapes
    - Use Ticker to draw line from 0,0 in Scene through to pointer location, highlight all shapes that the line intersects
    - For each shape, highlight the closest point on the shape to the pointer
    - For each shape, highlight the area of the shapes
    - Bound a circle around the scene edges, highlight all shapes that the circle intersects as well as points of intersection
  