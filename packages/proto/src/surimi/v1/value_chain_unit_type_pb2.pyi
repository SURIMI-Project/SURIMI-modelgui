from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from typing import ClassVar as _ClassVar

DESCRIPTOR: _descriptor.FileDescriptor

class ValueChainUnitType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    VALUE_CHAIN_UNIT_TYPE_UNSPECIFIED: _ClassVar[ValueChainUnitType]
    VALUE_CHAIN_UNIT_TYPE_PRODUCER: _ClassVar[ValueChainUnitType]
    VALUE_CHAIN_UNIT_TYPE_PROCESSING: _ClassVar[ValueChainUnitType]
    VALUE_CHAIN_UNIT_TYPE_DISTRIBUTION: _ClassVar[ValueChainUnitType]
    VALUE_CHAIN_UNIT_TYPE_WHOLESALER: _ClassVar[ValueChainUnitType]
    VALUE_CHAIN_UNIT_TYPE_RETAILER: _ClassVar[ValueChainUnitType]
    VALUE_CHAIN_UNIT_TYPE_CONSUMER: _ClassVar[ValueChainUnitType]
VALUE_CHAIN_UNIT_TYPE_UNSPECIFIED: ValueChainUnitType
VALUE_CHAIN_UNIT_TYPE_PRODUCER: ValueChainUnitType
VALUE_CHAIN_UNIT_TYPE_PROCESSING: ValueChainUnitType
VALUE_CHAIN_UNIT_TYPE_DISTRIBUTION: ValueChainUnitType
VALUE_CHAIN_UNIT_TYPE_WHOLESALER: ValueChainUnitType
VALUE_CHAIN_UNIT_TYPE_RETAILER: ValueChainUnitType
VALUE_CHAIN_UNIT_TYPE_CONSUMER: ValueChainUnitType
