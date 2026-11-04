from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from typing import ClassVar as _ClassVar

DESCRIPTOR: _descriptor.FileDescriptor

class RasterCellOrigin(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    RASTER_CELL_ORIGIN_UNSPECIFIED: _ClassVar[RasterCellOrigin]
    RASTER_CELL_ORIGIN_CENTROID: _ClassVar[RasterCellOrigin]
    RASTER_CELL_ORIGIN_TOP_LEFT: _ClassVar[RasterCellOrigin]
    RASTER_CELL_ORIGIN_TOP_RIGHT: _ClassVar[RasterCellOrigin]
    RASTER_CELL_ORIGIN_BOTTOM_LEFT: _ClassVar[RasterCellOrigin]
    RASTER_CELL_ORIGIN_BOTTOM_RIGHT: _ClassVar[RasterCellOrigin]
RASTER_CELL_ORIGIN_UNSPECIFIED: RasterCellOrigin
RASTER_CELL_ORIGIN_CENTROID: RasterCellOrigin
RASTER_CELL_ORIGIN_TOP_LEFT: RasterCellOrigin
RASTER_CELL_ORIGIN_TOP_RIGHT: RasterCellOrigin
RASTER_CELL_ORIGIN_BOTTOM_LEFT: RasterCellOrigin
RASTER_CELL_ORIGIN_BOTTOM_RIGHT: RasterCellOrigin
