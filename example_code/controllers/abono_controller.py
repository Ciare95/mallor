from flask import Blueprint, request, jsonify, flash
from app.models.abonos import AbonoModel

abono_bp = Blueprint('abonos', __name__)

@abono_bp.route('/agregar', methods=['POST'])
def agregar_abono():
    data = request.json
    id_venta = data.get('id_venta')
    monto = float(data.get('monto', 0))

    if not id_venta or monto <= 0:
        flash('Datos incompletos o monto inválido.', 'danger')
        return jsonify({'error': 'Datos incompletos o monto inválido.'}), 400

    venta = AbonoModel.obtener_venta(id_venta)

    if not venta:
        flash('Venta no encontrada.', 'danger')
        return jsonify({'error': 'Venta no encontrada.'}), 404

    if venta['estado'] == 'cancelada':
        flash('La venta ya está cancelada.', 'danger')
        return jsonify({'error': 'La venta ya está cancelada.'}), 400

    saldo_actual = float(venta['saldo'])  # Convert to float to match monto type

    if monto > saldo_actual:
        flash('El abono no puede exceder el saldo actual.', 'danger')
        return jsonify({'error': 'El abono no puede exceder el saldo actual.'}), 400

    try:
        AbonoModel.registrar_abono(id_venta, monto)
        nuevo_saldo = saldo_actual - monto
        estado = 'cancelada' if nuevo_saldo == 0 else 'pendiente'
        AbonoModel.actualizar_saldo(id_venta, nuevo_saldo, estado)

        flash('Abono registrado con éxito.', 'success')
        return jsonify({
            'message': 'Abono registrado con éxito.',
            'nuevo_saldo': nuevo_saldo,
            'estado': estado
        })

    except Exception as e:
        flash(f'Ocurrió un error: {str(e)}', 'danger')
        return jsonify({'error': str(e)}), 500


@abono_bp.route('/registrar_abono', methods=['POST'])
def registrar_abono():
    try:
        data = request.get_json()
        id_venta = data.get('id_venta')
        monto_abono = float(data.get('monto_abono'))

        venta = AbonoModel.obtener_venta(id_venta)
        if not venta:
            return jsonify({'error': 'Venta no encontrada.'}), 404

        saldo_actual = float(venta['saldo'])  # Convert to float to match monto_abono type
        if monto_abono > saldo_actual:
            return jsonify({'error': 'El abono no puede exceder el saldo actual.'}), 400

        # Registrar el abono y actualizar el saldo
        AbonoModel.registrar_abono(id_venta, monto_abono)
        nuevo_saldo = saldo_actual - monto_abono

        # Si el saldo es 0, actualizar el estado de la venta a cancelada
        estado = 'cancelada' if nuevo_saldo == 0 else 'pendiente'
        AbonoModel.actualizar_saldo(id_venta, nuevo_saldo, estado)

        return jsonify({'message': 'Abono registrado con éxito.', 'nuevo_saldo': nuevo_saldo, 'estado': estado})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
