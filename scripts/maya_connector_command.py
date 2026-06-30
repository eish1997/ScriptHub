import json
import os
import sys
import traceback


def main():
    operation = sys.argv[1] if len(sys.argv) > 1 else ""
    request = read_request()

    try:
        if operation == "selection":
            write_response(ok=True, data=read_selection())
            return

        if operation == "export_fbx":
            write_response(ok=True, data=export_fbx(request))
            return

        if operation == "self_test_export":
            write_response(ok=True, data=self_test_export(request))
            return

        write_response(
            ok=False,
            error={
                "code": "unknown_operation",
                "message": "Unknown Maya connector operation: {}".format(operation),
                "recoverable": False,
            },
        )
    except Exception as error:
        write_response(
            ok=False,
            error={
                "code": classify_error(error),
                "message": str(error),
                "recoverable": True,
                "details": traceback.format_exc(),
            },
        )


def read_request():
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    return json.loads(raw)


def read_selection():
    cmds = load_maya_cmds()
    selected = cmds.ls(selection=True, long=True) or []
    objects = []

    for name in selected:
        node_type = "unknown"
        try:
            node_type = cmds.nodeType(name)
        except Exception:
            pass
        objects.append({"name": name, "type": node_type})

    return {
        "checked_at": utc_now(),
        "count": len(objects),
        "objects": objects,
        "source_uri": "maya://selection/current",
    }


def export_fbx(request):
    cmds = load_maya_cmds()
    local_path = request.get("local_path") or request.get("output_path")
    output_path = request.get("output_path") or local_path
    overwrite = bool(request.get("overwrite"))
    selection = request.get("selection") or read_selection()
    objects = selection.get("objects") or []

    if not objects:
        raise RecoverableMayaError("empty_selection", "Maya selection is empty")

    if not local_path or not local_path.lower().endswith(".fbx"):
        raise RecoverableMayaError("invalid_output_path", "output_path must end with .fbx")

    if os.path.exists(local_path) and not overwrite:
        raise RecoverableMayaError("output_exists", "Output already exists: {}".format(output_path))

    parent = os.path.dirname(local_path)
    ensure_dir(parent)

    names = [item.get("name") for item in objects if item.get("name")]
    if names:
        cmds.select(names, replace=True)

    load_fbx_plugin(cmds)
    escaped = local_path.replace("\\", "/")
    cmds.file(
        escaped,
        force=overwrite,
        options="v=0;",
        preserveReferences=True,
        type="FBX export",
        exportSelected=True,
    )

    return {
        "bytes": os.path.getsize(local_path),
        "exported_at": utc_now(),
        "local_path": local_path,
        "selected_objects": names,
        "selection_count": len(names),
        "source_uri": selection.get("source_uri", "maya://selection/current"),
        "storage_uri": output_path,
        "trace_id": request.get("trace_id"),
    }


def self_test_export(request):
    cmds = load_maya_cmds()
    output_path = request.get("output_path") or os.path.abspath(
        os.path.join(".scripthub", "maya-connector", "self_test_export.fbx")
    )
    local_path = request.get("local_path") or output_path
    parent = os.path.dirname(local_path)
    ensure_dir(parent)

    try:
        cmds.file(new=True, force=True)
    except Exception:
        pass

    cube = cmds.polyCube(name="ScriptHubConnectorSmokeCube")[0]
    cmds.select([cube], replace=True)
    return export_fbx(
        {
            "local_path": local_path,
            "output_path": output_path,
            "overwrite": True,
            "selection": {
                "objects": [{"name": cube, "type": "mesh"}],
                "source_uri": "maya://self_test/selection",
            },
            "trace_id": request.get("trace_id"),
        }
    )


def load_fbx_plugin(cmds):
    try:
        if not cmds.pluginInfo("fbxmaya", query=True, loaded=True):
            cmds.loadPlugin("fbxmaya")
    except Exception as error:
        raise RecoverableMayaError("fbx_plugin_unavailable", str(error))


def load_maya_cmds():
    try:
        initialize_maya_standalone()
        import maya.cmds as cmds  # type: ignore

        return cmds
    except Exception as error:
        raise RecoverableMayaError(
            "maya_python_unavailable",
            "maya.cmds is unavailable. Run this command with mayapy or inside Maya: {}".format(error),
        )


def initialize_maya_standalone():
    try:
        import maya.standalone  # type: ignore

        try:
            maya.standalone.initialize(name="python")
        except Exception:
            pass
    except Exception:
        pass


def ensure_dir(directory):
    if directory and not os.path.exists(directory):
        os.makedirs(directory)


def write_response(ok, data=None, error=None):
    payload = {
        "data": data,
        "error": error,
        "ok": ok,
    }
    sys.stdout.write(json.dumps(payload))


def utc_now():
    from datetime import datetime

    return datetime.utcnow().isoformat() + "Z"


def classify_error(error):
    if isinstance(error, RecoverableMayaError):
        return error.code
    return "maya_connector_command_failed"


class RecoverableMayaError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


if __name__ == "__main__":
    main()
