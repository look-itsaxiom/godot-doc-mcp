export interface ConceptOverview {
  title: string;
  overview: string;
  examples: string[];
}

export const CONCEPT_REGISTRY: Record<string, ConceptOverview> = {
  scene_tree: {
    title: "Scene Tree & Nodes",
    overview:
      "Godot's scene system is built on Nodes organized in a tree hierarchy. Every game object is a Node, and scenes are reusable branches of nodes. Nodes have lifecycle callbacks (_ready, _process, _physics_process), communicate via signals, and can be organized into groups. The SceneTree manages the active tree and provides utilities for pausing, quitting, and deferred calls.",
    examples: [
      "var sprite = Sprite2D.new()\nadd_child(sprite)",
      "func _ready():\n\tprint(\"Node entered the tree\")",
      "func _process(delta):\n\tposition.x += speed * delta",
      "get_node(\"Player/Sprite2D\").visible = false",
      "$Player.position = Vector2.ZERO",
      "add_to_group(\"enemies\")\nget_tree().call_group(\"enemies\", \"alert\")",
      "signal health_changed(new_hp: int)\nhealth_changed.emit(current_hp)",
    ],
  },
  physics: {
    title: "Physics System",
    overview:
      "Godot provides both 2D and 3D physics engines. Physics bodies (RigidBody, StaticBody, CharacterBody) interact through collision shapes attached as children. Areas detect overlap without physical response. Raycasts and shape queries let you probe the world. Joints constrain bodies together. CharacterBody nodes use move_and_slide() for platformer/FPS-style movement.",
    examples: [
      "# CharacterBody2D movement\nfunc _physics_process(delta):\n\tvelocity.x = Input.get_axis(\"left\", \"right\") * SPEED\n\tvelocity.y += GRAVITY * delta\n\tmove_and_slide()",
      "# Apply impulse to a RigidBody3D\nfunc hit(direction: Vector3):\n\tapply_central_impulse(direction * 10.0)",
      "# Raycast query\nvar query = PhysicsRayQueryParameters3D.create(from, to)\nvar result = get_world_3d().direct_space_state.intersect_ray(query)",
      "# Area body detection\nfunc _on_area_body_entered(body: Node3D):\n\tif body.is_in_group(\"player\"):\n\t\tcollect()",
    ],
  },
  rendering: {
    title: "Rendering & Graphics",
    overview:
      "Godot's rendering system covers 2D sprites, 3D meshes, materials, shaders, lights, cameras, and viewports. CanvasItem is the base for all 2D drawing; VisualInstance3D is the base for 3D visuals. Materials (StandardMaterial3D, ShaderMaterial) control surface appearance. Shaders are written in Godot's GLSL-like shading language. Cameras define the view, and viewports can render sub-scenes or post-processing.",
    examples: [
      "# Set a sprite texture\n$Sprite2D.texture = preload(\"res://icon.svg\")",
      "# Custom drawing in 2D\nfunc _draw():\n\tdraw_circle(Vector2.ZERO, 32.0, Color.RED)",
      "# Assign a material to a mesh\nvar mat = StandardMaterial3D.new()\nmat.albedo_color = Color(0.2, 0.6, 1.0)\n$MeshInstance3D.material_override = mat",
      "# ShaderMaterial from code\nvar shader = Shader.new()\nshader.code = \"shader_type canvas_item;\\nvoid fragment() { COLOR = vec4(UV, 0.5, 1.0); }\"\nvar mat = ShaderMaterial.new()\nmat.shader = shader",
      "# Camera setup\n$Camera3D.make_current()\n$Camera3D.fov = 75.0",
    ],
  },
  audio: {
    title: "Audio System",
    overview:
      "Godot's audio system uses AudioStreamPlayer nodes to play AudioStream resources (WAV, OGG, MP3). AudioStreamPlayer2D and AudioStreamPlayer3D add positional audio. The AudioServer manages buses for mixing, effects (reverb, EQ, compression), and volume. Audio buses are configured in the Audio Bus Layout editor and controlled at runtime.",
    examples: [
      "$AudioStreamPlayer.stream = preload(\"res://sfx/jump.ogg\")\n$AudioStreamPlayer.play()",
      "# Positional audio\n$AudioStreamPlayer3D.position = global_position\n$AudioStreamPlayer3D.play()",
      "# Adjust bus volume\nAudioServer.set_bus_volume_db(AudioServer.get_bus_index(\"Music\"), -6.0)",
      "# Fade out\nvar tween = create_tween()\ntween.tween_property($AudioStreamPlayer, \"volume_db\", -80.0, 2.0)",
    ],
  },
  animation: {
    title: "Animation System",
    overview:
      "AnimationPlayer stores and plays Animation resources that keyframe any node property over time. AnimationTree blends multiple animations using state machines or blend trees -- ideal for character animation. Tweens provide lightweight procedural animation for one-off transitions. Skeleton2D/Skeleton3D support bone-based deformation, and SkeletonIK3D solves inverse kinematics.",
    examples: [
      "$AnimationPlayer.play(\"walk\")",
      "# AnimationTree state machine\nvar sm = $AnimationTree.get(\"parameters/playback\") as AnimationNodeStateMachinePlayback\nsm.travel(\"jump\")",
      "# Tween a property\nvar tween = create_tween()\ntween.tween_property($Sprite2D, \"modulate:a\", 0.0, 0.5)\ntween.tween_callback(queue_free)",
      "# Tween with easing\nvar tween = create_tween().set_trans(Tween.TRANS_BOUNCE)\ntween.tween_property($Node, \"position:y\", 0.0, 1.0)",
    ],
  },
  ui: {
    title: "UI / Control Nodes",
    overview:
      "Control nodes form Godot's GUI system. They use anchors, margins, and containers for layout. Common controls include Button, Label, TextEdit, LineEdit, OptionButton, and Tree. Containers (VBoxContainer, HBoxContainer, GridContainer) auto-arrange children. Themes let you style controls globally with fonts, colors, and styleboxes. Control.gui_input handles focused input.",
    examples: [
      "# Button press\nfunc _on_start_button_pressed():\n\tget_tree().change_scene_to_file(\"res://game.tscn\")",
      "# Update a label\n$ScoreLabel.text = \"Score: %d\" % score",
      "# Dynamic button\nvar btn = Button.new()\nbtn.text = \"Click me\"\nbtn.pressed.connect(_on_pressed)\n$VBoxContainer.add_child(btn)",
      "# Theme override\n$Label.add_theme_font_size_override(\"font_size\", 24)\n$Label.add_theme_color_override(\"font_color\", Color.YELLOW)",
      "# Container sizing\n$Panel.custom_minimum_size = Vector2(200, 100)",
    ],
  },
  input: {
    title: "Input Handling",
    overview:
      "Godot routes input through InputEvent objects delivered to _input(), _unhandled_input(), and _gui_input(). The Input singleton provides action polling (is_action_pressed, get_axis, get_vector) mapped in Project Settings. Input actions abstract away device specifics so the same code works for keyboard, gamepad, and touch. InputEventAction, InputEventKey, InputEventMouseButton, and InputEventScreenTouch are the main event types.",
    examples: [
      "func _unhandled_input(event):\n\tif event.is_action_pressed(\"jump\"):\n\t\tvelocity.y = JUMP_FORCE",
      "# Polling style\nvar dir = Input.get_vector(\"left\", \"right\", \"up\", \"down\")\nvelocity = dir * SPEED",
      "# Mouse click\nfunc _input(event):\n\tif event is InputEventMouseButton and event.pressed:\n\t\tprint(\"Clicked at \", event.position)",
      "# Consume input to prevent propagation\nfunc _gui_input(event):\n\tif event is InputEventMouseButton:\n\t\taccept_event()",
    ],
  },
  networking: {
    title: "Networking & Multiplayer",
    overview:
      "Godot's high-level multiplayer uses MultiplayerAPI with ENet or WebSocket peers. MultiplayerSpawner and MultiplayerSynchronizer automate replication. RPCs (remote procedure calls) are declared with @rpc annotations and called with .rpc(). For HTTP, use HTTPRequest or HTTPClient. WebSocketPeer handles raw WebSocket connections.",
    examples: [
      "# Host a server\nvar peer = ENetMultiplayerPeer.new()\npeer.create_server(7000)\nmultiplayer.multiplayer_peer = peer",
      "# Connect as client\nvar peer = ENetMultiplayerPeer.new()\npeer.create_client(\"127.0.0.1\", 7000)\nmultiplayer.multiplayer_peer = peer",
      "@rpc(\"any_peer\", \"reliable\")\nfunc take_damage(amount: int):\n\thealth -= amount",
      "# HTTP request\nvar http = HTTPRequest.new()\nadd_child(http)\nhttp.request_completed.connect(_on_response)\nhttp.request(\"https://api.example.com/data\")",
    ],
  },
  resources: {
    title: "Resource System",
    overview:
      "Resources are data containers that can be saved to disk and shared between nodes. Built-in resources include Texture2D, AudioStream, PackedScene, and Material. Custom resources extend Resource and use @export to expose properties in the inspector. Resources are loaded with load()/preload() and saved with ResourceSaver. They are reference-counted and deduplicated when loaded from the same path.",
    examples: [
      "# Custom resource\nclass_name Stats extends Resource\n@export var max_hp: int = 100\n@export var attack: float = 10.0",
      "# Load and use\nvar stats: Stats = preload(\"res://data/player_stats.tres\")\nprint(stats.max_hp)",
      "# Save a resource\nvar res = Stats.new()\nres.max_hp = 200\nResourceSaver.save(res, \"res://data/boss_stats.tres\")",
      "# Duplicate to avoid shared edits\nvar my_copy = stats.duplicate()",
    ],
  },
  math: {
    title: "Math Types & Utilities",
    overview:
      "Godot provides built-in math types: Vector2/3/4, Transform2D/3D, Basis, Quaternion, AABB, Rect2, Plane, and Color. These support common operations (dot, cross, lerp, slerp, inverse) with operator overloads. The global Math functions and @GlobalScope utilities (lerp, clamp, remap, randf, deg_to_rad) complement the types. Geometry2D and Geometry3D provide intersection and polygon utilities.",
    examples: [
      "var dir = (target - position).normalized()\nposition += dir * speed * delta",
      "# Lerp for smooth movement\nposition = position.lerp(target, 0.1)",
      "# Transform operations\nvar t = Transform3D.IDENTITY\nt = t.rotated(Vector3.UP, deg_to_rad(45.0))\nt = t.translated(Vector3(0, 1, 0))",
      "# Quaternion slerp\nvar q = start_quat.slerp(end_quat, weight)",
      "# AABB intersection\nif aabb_a.intersects(aabb_b):\n\tprint(\"overlapping\")",
      "# Random in range\nvar x = randf_range(-10.0, 10.0)",
    ],
  },
  general: {
    title: "General / Uncategorized",
    overview:
      "Classes that do not fit neatly into a single domain concept. These include engine singletons, OS utilities, file I/O, scripting helpers, and other foundational types.",
    examples: [
      "var file = FileAccess.open(\"user://save.dat\", FileAccess.WRITE)\nfile.store_var(data)",
      "OS.get_user_data_dir()",
    ],
  },
};
