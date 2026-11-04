from surimi.v1 import coordinate_reference_system_pb2 as _coordinate_reference_system_pb2
from surimi.v1 import raster_cell_origin_pb2 as _raster_cell_origin_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Geography(_message.Message):
    __slots__ = ("raster_cell_origin", "crs", "xres", "yres", "ncol", "nrow", "xmin", "xmax", "ymin", "ymax")
    RASTER_CELL_ORIGIN_FIELD_NUMBER: _ClassVar[int]
    CRS_FIELD_NUMBER: _ClassVar[int]
    XRES_FIELD_NUMBER: _ClassVar[int]
    YRES_FIELD_NUMBER: _ClassVar[int]
    NCOL_FIELD_NUMBER: _ClassVar[int]
    NROW_FIELD_NUMBER: _ClassVar[int]
    XMIN_FIELD_NUMBER: _ClassVar[int]
    XMAX_FIELD_NUMBER: _ClassVar[int]
    YMIN_FIELD_NUMBER: _ClassVar[int]
    YMAX_FIELD_NUMBER: _ClassVar[int]
    raster_cell_origin: _raster_cell_origin_pb2.RasterCellOrigin
    crs: _coordinate_reference_system_pb2.CoordinateReferenceSystem
    xres: float
    yres: float
    ncol: int
    nrow: int
    xmin: float
    xmax: float
    ymin: float
    ymax: float
    def __init__(self, raster_cell_origin: _Optional[_Union[_raster_cell_origin_pb2.RasterCellOrigin, str]] = ..., crs: _Optional[_Union[_coordinate_reference_system_pb2.CoordinateReferenceSystem, _Mapping]] = ..., xres: _Optional[float] = ..., yres: _Optional[float] = ..., ncol: _Optional[int] = ..., nrow: _Optional[int] = ..., xmin: _Optional[float] = ..., xmax: _Optional[float] = ..., ymin: _Optional[float] = ..., ymax: _Optional[float] = ...) -> None: ...
